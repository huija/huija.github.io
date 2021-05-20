---
title: "MongoDB分片集"
date: 2021-05-19T13:43:19+08:00
draft: true
tags: ["数据库","MongoDB","分布式"]
toc: true
---

# MongoDB分片集
MongoDB分片集, 能够应对普通复制集无法应对的海量数据场景, 以及地理数据分布场景.

> 分片集是基于复制集基础上的, 从架构角度, 复制集可以平滑地过度到分片集, 而无需修改代码, 
> 但是简单地这么思考, 其实并不正确, 分片集群, 相比复制集有得也有失, 是有所掣肘的.

## 浅谈分片集
先撇开MongoDB谈分片
- 普通的RDBMS如MySQL和PostgreSQL, 基本没提供分片功能, 当然, 他们自己甚至没有提供复制集failover的功能, 
但是也有人基于他们做了一些分片产品, 比如MyCat给MySQL分片, 基于PostgreSQL的GreenPlum等, 也可以看出, 对于RDBMS本身,
分片不是产品本身核心关心的点.
- Redis提供了分片模式, 也就是他们的Cluster集群模式, 总共16384个slot数据槽, 可以通过手动分配这些槽在指定地分片上,
而数据在哪个槽内, 则是固定的一致性hash算法来实现的, 也就是说Redis集群实现了固定的分片, 使用者没法精确地控制数据流转, 
其分片集群的作用, 主要是解决, 数据过多, 单机内存不够的问题, 而数据分配策略, 则很简陋, 而且无法自动地进行数据迁移.
- 消息队列, Kafka的分区Partition也是分片思想, 主要是用于多消费者, 增大吞吐量.
- 大数据, HDFS的分块, HBase的Region等

### 分片集的意义
分片集核心的意义是横向拓展, 当一台机器性能不够时, 通过增加机器, 来提高系统整体能够提供的服务量.

> 传统提高性能的方法, 区分为纵向拓展(垂直拓展)和横向拓展(水平拓展), 前者是提升单机性能, 后者是增加机器.

### 分片集的问题
分片集最核心的问题, 实际就是分片的策略问题, 容易出现的问题如下.

- 数据过于集中于一个分片, 也就是热点问题, 分了个寂寞.
- 数据过于分散, 一个范围查询, 需要查到所有分片, 才能把数据查出来.

> 次要的问题: 数据迁移等

## MongoDB分片集
MongoDB的分片集基于复制集而来, 每一个数据复制集, 都可以理解为一个分片Shard, 存放部分数据, 当复制集升到分片集后,
Client就不该直接访问这些复制集群了, 而是访问更上层的mongos集群, 其负责请求的转发, 是Client与Shard之间的代理者,
此外, 还有一个configs复制集群, 用于存储分片集群的元数据,分片配置等信息.

![](https://huija.github.io/images/shard-set.png)

> Shard和configs都是复制集群, 而mongos可以理解为nginx那种, 启多个存粹是为了高可用和横向拓展.

### 直接部署
单机部署, 分配下端口
- mongos: 29017
- configs: 29018,29019,29020
- shard1: 29021,29022,29023
- shard2: 29024,29025,29026

具体部署过程比较多, 下面会省略一些过程.

> 初学者搭建分片集群, 可以先不设置keyFile部分, 后续创建user后再设置keyFile.

#### 搭建复制集
分片集内的复制集与普通的单个复制集, 在设置上有一定区别, 需要额外指定复制集在分片集内的角色.

```shell script
sharding:
   clusterRole: shardsvr 或者 configsvr
   archiveMovedChunks: false
```

> 我们需要搭建好, shard1,shard2,configs 3个复制集

#### 搭建mongos
mongos区别于普通的`mongod`进程, 其由`mongos`程序启动, 配置如下:

```shell script
systemLog:
  destination: file
  logAppend: true
  path: /home/huijia/programs/mongodb-4.4.1/shard/mongos/mongos.log
processManagement:
  fork: true
  pidFilePath: /home/huijia/programs/mongodb-4.4.1/shard/mongos/mongos.pid
net:
  port: 29017
  bindIp: 0.0.0.0
security:
  # authorization: enabled
  clusterAuthMode: keyFile
  keyFile: /home/huijia/programs/mongodb-4.4.1/config/keyfile
sharding:
  configDB: configs/127.0.0.1:29018,127.0.0.1:29019,127.0.0.1:29020
```

直接`mongos -f mongos.conf`就能启动成功

#### 启动进程
启动的进程比较多, 如下, 启动了10个进场.
```shell script
#!/bin/bash
mongod -f configs/replica_1.conf
mongod -f configs/replica_2.conf
mongod -f configs/replica_3.conf
mongod -f shard1/replica_1.conf
mongod -f shard1/replica_2.conf
mongod -f shard1/replica_3.conf
mongod -f shard2/replica_1.conf
mongod -f shard2/replica_2.conf
mongod -f shard2/replica_3.conf
mongos -f mongos/mongos.conf
```

#### 分片集强制校验
可以参考: https://docs.mongodb.com/manual/tutorial/enforce-keyfile-access-control-in-existing-sharded-cluster/

简单归纳, `mongos localhost:29017`连接到mongos后:
```shell script
db.getSiblingDB("admin").createUser(
  {
    user: "root",
    pwd:  "123456",
    roles: [ { role: "userAdminAnyDatabase", db: "admin" } ]
  }
)
db.getSiblingDB("admin").auth("root", "123456")
db.getSiblingDB("admin").createUser(
  {
    "user" : "admin",
    "pwd" : "123456",
    roles: [ { "role" : "clusterAdmin", "db" : "admin" } ]
  }
)
db.getSiblingDB("admin").auth("admin", "123456")
```

> 添加user后, 需要关闭所有进程, 设置好keyFile然后重启.

#### 添加分片
```shell script
$ mongo localhost:29017 -u "admin" -p --authenticationDatabase "admin"
mongos> sh.status()
...
mongos> sh.addShard( "shard1/127.0.0.1:29021,127.0.0.1:29022,127.0.0.1:29023" )
mongos> sh.addShard( "shard2/127.0.0.1:29024,127.0.0.1:29025,127.0.0.1:29026" )
mongos> sh.status()
...
  shards:
        {  "_id" : "shard1",  "host" : "shard1/127.0.0.1:29021,127.0.0.1:29022,127.0.0.1:29023",  "state" : 1 }
        {  "_id" : "shard2",  "host" : "shard2/127.0.0.1:29024,127.0.0.1:29025,127.0.0.1:29026",  "state" : 1 }
...
```
> 到这里, 一个完整的分片集就搭建好了.

### 实践分片
如果集群开启了校验, 就需要使用前面创建的`userAdminAnyDatabase`账户来创建db user
```shell script
# 对指定集合开启分片
sh.enableSharding("foo")
sh.shardCollection("foo.demo",{_id:"hashed"})
use foo
# 创建并使用角色
db.getSiblingDB("admin").auth("root", "123456")
db.getSiblingDB("admin").createUser(
  {
    "user" : "foo",
    "pwd" : "123456",
    roles: [ { "role" : "readWrite", "db" : "foo" } ]
  }
)
db.getSiblingDB("admin").auth("foo", "123456")
# 插入数据
for(var i=0;i<10000;i++){
    db.demo.insert({i:i})
}
db.demo.stats().sharded
# 查看集群状态
db.getSiblingDB("admin").auth("admin", "123456")
sh.status()
...
                foo.demo
                        shard key: { "_id" : "hashed" }
                        unique: false
                        balancing: true
                        chunks:
                                shard1  2
                                shard2  2
                        { "_id" : { "$minKey" : 1 } } -->> { "_id" : NumberLong("-4611686018427387902") } on : shard1 Timestamp(1, 0)
                        { "_id" : NumberLong("-4611686018427387902") } -->> { "_id" : NumberLong(0) } on : shard1 Timestamp(1, 1)
                        { "_id" : NumberLong(0) } -->> { "_id" : NumberLong("4611686018427387902") } on : shard2 Timestamp(1, 2)
                        { "_id" : NumberLong("4611686018427387902") } -->> { "_id" : { "$maxKey" : 1 } } on : shard2 Timestamp(1, 3)
...
```

#### 片键与分片策略
mongodb支持的分片策略, 有hash, range, zone三种

#### chunk概念
chunk是分片集合内的一个文档块, 由片键条件相近(范围)的数据组合在一起.

#### balance概念
chunk在分片内迁移, 从而实现分片之间的负载接近, 这就是balance的意义.

### 是否选用分片集?
虽然分片集群也很优秀, 但是是否需要使用分片集群? 如果使用, 需要多少分片? 都是需要考虑的.

#### 分片集群VS复制集群
优点
- 可以支持海量数据, 应对更多的请求量
- 可以地理分布, 面向不同地区的用户
- 无感知, 复制集可迁移分片集, 而无需改动应用代码

缺点
- 额外资源多,管理复杂, 耗费机器多.
- 不支持联表, 无法应对唯一索引等场景.

#### 分片数预估
并发量/(单机并发*0.7), 总数据量/2TB, 热数据内存/(单机内存*0.6), 三者取最大值

## 总结
MongoDB分片集, 开源产品就支持, 而且十分强大.
- 分片集搭建: https://docs.mongodb.com/manual/tutorial/deploy-shard-cluster/
- Hash策略: https://docs.mongodb.com/manual/core/hashed-sharding/
- Range策略: https://docs.mongodb.com/manual/core/ranged-sharding/
- Zone策略: https://docs.mongodb.com/manual/core/zone-sharding/

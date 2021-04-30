---
title: "MongoDB入门"
date: 2021-04-29T09:44:48+08:00
draft: true
tags: ["数据库","入门"]
toc: true
---

# MongoDB入门
MongoDB是面向文档的数据库, 有区别于传统的RDBMS(Oracle,MySQL,PostgreSQL...), 是一个基于文档(`BSON`)存储的开源数据库系统.

## 最直观感受
- **表**在MongoDB内叫**集合**, 英文名**Collection**, 表示一批同类文档的集合
- 每**一行数据**在MongoDB内可以叫**一个文档**, 英文**Document**, 存储格式**Binary Json**, 可以简单类比为Json
- MongoDB是NoSQL数据库, 有自己的语法规则, 也就是不使用SQL进行CRUD(但是其BI Connector支持模拟MySQL进行查询)
- MongoDB推崇Schema Less, 无需提前设计表的结构, 同一个集合内的文档可以有不同的字段

## 理解Document概念
文档是文档型数据库的数据存储格式, 从根本上影响使用人员的方方面面.
- 传统的RDBMS是基于Relation Model, 需要开发人员对现实业务进行抽象, 根据范式标准设计表结构, 使用联表查询来表示完整的事物结构, 关键词: 主键, 外键, 关系模型, 三范式.
- 文档的存储可以理解为存了一个Json, 特性是支持对象模型的灵活**组合**, 一般情况下, 无需进行过度的设计拆分, 此外, 可以灵活地增删列是其一大核心优势, 关键词: 组合, Schema Less

### 业务设计举例
**商品, 出入库设计**
- 传统RDBMS会设计为, '商品表'+'出入库表', 以商品ID作为外键进行关联
- 作为文档型数据库, MongoDB只需要一个'商品表', 而出入库记录作为商品表的一个数组类型字段直接存在一起.

### Binary Json
MongoDB自己设计使用的Bson, 类似Json格式, 支持更多的数据类型: https://docs.mongodb.com/manual/reference/bson-types/

> Bson实际就是一种`buffer`编码规则, 对外呈现Json格式, 
> 客户端以Bson为参数, 对MongoDB进行RPC调用, 然后得到同样为Bson格式的返回结果.

### _id字段
每一行文档都有一个自己的唯一标志: `_id`, 有点类似于RDBMS内的`Row Num`, 不推荐用户自己进行定义, 其具有自己的生成规则, 
默认是ObjectId类型, 其本质是长度12的byte数组, 前4个byte是时间戳, 中间5个byte是当前进程标志, 最后3个byte是程序内的计数器.

## 与RDBMS比较
如果说开源的RDBMS还有PostgreSQL和MySQL进行竞争, 那MongoDB可以说是文档型数据库的执牛耳者.

> MongoDB主要还是针对OLTP场景, 并提供了适当的OLAP支持, 但是决定是否选择它, 最主要还是要了解其优劣.

### 优势 
- Schema Less, 减少设计负担, 灵活应对业务变更进行字段增减; 模型的嵌套组合, 避免联表查询, 减少了磁盘IO次数.
- 同样丰富的索引类型, B树, 文本索引, Hash索引, 2d坐标索引, 特殊的ttl索引(实现文档过期)等...MongoDB支持在二级key进行索引.
- 单文档操作具有原子性, 覆盖足够的事务场景, 以及4.0已经支持的多文档事务(4.2以后分片集群也支持,所以也叫分布式事务)
- 开源版就支持集群部署, 支持**复制集**和**分片集**, 对读写分离, 海量数据, 多云架构等各种分布式场景天然支持.
- 丰富的插件系统, Spark Connector支持Spark分析数据, BI Connector支持模拟MySQL来进行SQL查询...
- 其余功能, Grid/Fs文件存储, 聚合操作支持数据的Pipeline加工(有限的OLAP), 支持基于时间点恢复(PITR), 自带监控工具等.

### 劣势
- Schema Less, 过于灵活, 但并不意味着无设计, 完全的无设计只会影响软件的健壮性.
- 大量的空间换时间的优化, 使得MongoDB在资源占用(内存, 磁盘)上居高不下, 需要更谨慎地创建索引.
- 外键功能薄弱, 且联表的语法较为复杂, 在分片集群无法使用联表查询, 所以避免联表几乎是必须的.
- 基于文档存储, 对SQL基本无支持, 原RDBMS数据如果迁移, 便意味着完全重构服务.
- 不建议使用MongoDB的单机部署模式, 最少也应该上到复制集架构, 来实现DB的高可用.
- 多文档事务性能不佳, 隔离级别的指定, 需要配置多项读写参数, 理解起来也较为复杂, 不推荐使用.

## 单机部署使用
单机版本的MongoDB搭建十分简单, 直接看[官方文档](https://docs.mongodb.com/manual/administration/install-community/)也能直接看懂,
我个人比较推荐的是使用tgz压缩包进行部署, 也就是已经编译好的二进制包, 选择合适平台与版本下载, [下载传送门](https://www.mongodb.com/try/download/community)

Linux为例
```shell script
cd ~/programs
wget https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-ubuntu2004-4.4.1.tgz
tar zxvf mongodb-linux-x86_64-ubuntu2004-4.4.1.tgz -C .
# 改名文件夹...
cd mongodb-4.4.1
mkdir data config
cd config
touch mongo.conf
```

配置文件提供一个参考, 如下.
```yaml
storage:
  dbPath: /home/huijia/programs/mongodb-4.4.1/data
  journal:
    enabled: true
systemLog:
  destination: file
  logAppend: true
  path: /home/huijia/programs/mongodb-4.4.1/log/mongod.log
processManagement:
  fork: true
  pidFilePath: /home/huijia/programs/mongodb-4.4.1/mongod.pid
net:
  port: 27017
  bindIp: 0.0.0.0
```

启动
```shell script
export PATH=$PATH:/home/huijia/programs/mongodb-4.4.1/bin
mongod -f /home/huijia/programs/mongodb-4.4.1/config/mongo.conf
```

查看
```shell script
$ lsof -i:27017
COMMAND  PID   USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
mongod  9217 huijia   12u  IPv4  28889      0t0  TCP *:27017 (LISTEN)
```

终止
```shell script
pkill mongod
```

### crud操作
简单进行下crud操作
```shell script
$ mongo localhost:27017
...
> show dbs
admin           0.000GB
config          0.000GB
local           0.000GB
> use demo
switched to db demo
> show collections
> db.test.insert({"x":1,"y":2})
WriteResult({ "nInserted" : 1 })
> db.test.insert({"x":2,"y":3,"z":1})
WriteResult({ "nInserted" : 1 })
> db.test.find({"x":1})
{ "_id" : ObjectId("608a9bc2a09bfa905f74fbaa"), "x" : 1, "y" : 2 }
> db.test.find({"x":2},{"_id":0,"x":1})
{ "x" : 2 }
> db.test.update({"x":1},{"$set":{"y":1}})
WriteResult({ "nMatched" : 1, "nUpserted" : 0, "nModified" : 1 })
> db.test.find({"x":1},{"_id":0})
{ "x" : 1, "y" : 1 }
> db.test.findAndModify({query:{"x":1},update:{"$set":{"y":2}},new:true})
{ "_id" : ObjectId("608a9bc2a09bfa905f74fbaa"), "x" : 1, "y" : 2 }
> db.test.deleteOne({"x":1})
{ "acknowledged" : true, "deletedCount" : 1 }
> db.test.find({})
{ "_id" : ObjectId("608a9bcea09bfa905f74fbab"), "x" : 2, "y" : 3 }
> db.test.aggregate([{"$match":{"x":2}}, {"$addFields":{"z":["$x","$y"]}}])
{ "_id" : ObjectId("608a9bcea09bfa905f74fbab"), "x" : 2, "y" : 3, "z" : [ 2, 3 ] }
> db.test.drop()
true
```

上面涉及了一些概念的皮毛:
- 无需创建DB,Table这些,不同格式的BSON文档也可以存一个集合 
- 初步感受下MongoDB最原始的操作, insert, find, update, delete
- project代替select, findAndModify原子操作, update操作符, aggregate聚合操作等

### GUI客户端
个人推荐使用Mongo官方的Compass, 而非Navicat这种, [下载传送门](https://www.mongodb.com/try/download/compass)

## 总结
MongoDB作为文档型数据库, 具有很独特的特点, 性能卓越, 功能丰富, 在分布式场景极为优秀, 是十分值得学习使用的数据库产品.

- 官方网站: https://www.mongodb.com/
- 官方文档: https://docs.mongodb.com/manual/
- 官方Jira: https://jira.mongodb.org/
- github组织: https://github.com/mongodb

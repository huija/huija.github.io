---
title: "MongoDB复制集"
date: 2021-05-07T13:37:16+08:00
draft: true
tags: ["数据库","MongoDB","分布式"]
toc: true
---

MongoDB复制集是MongoDB分布式系统的核心.

> mongodb的api对于单点,复制集,分片集群都通用的, 这也就意味着, 改变底层数据库的部署架构, 客户端代码基本无需改动.

## 1. 浅谈复制集

先撇开MongoDB单独来讲复制集群, 顾名思义, 就是从原先的机器复制一份, 一起部署为一个集群, 在分布式场景是很常见的部署架构, 以数据库们为例, 就有MySQL基于binlog的主从部署, PostgreSQL基于WAL日志的同步/异步流复制, Redis的主从复制等.

### 1.1. 复制集的意义

* 复制集本身, 解决的根本问题是, 单机部署的单点故障问题, 当**主节点**挂掉, 可以转正**从节点**, 也就是数据冗余备份以及高可用.
* 衍生出来的, 是可以进行读写分流, 并可以针对读的流量进行横向扩展, 也就是可伸缩性与负载均衡.

### 1.2. 复制集的问题

复制集的最核心的问题集中于数据消息从**主节点**到**从节点**的备份策略, 同步还是异步

* 如果同步备份, 那么会保证每个操作后, 主从的数据都是一致的, 也就是强一致性, 但是如果**从节点**挂了, 使用同步的策略, 那**主节点**的请求则需要返回失败, 这就涉及集群可用性的问题.
* 一般数据库的主流策略都是异步, 不追求数据的强一致性, 而是最终一致性, 重点保证可用性, 而实时性问题, 则通过一定手段进行避免.

> 次要的问题: failover障碍转移, 主节点选举, 数据消息的协议等.

## 2. MongoDB复制集

MongoDB的主从叫Primary和Secondary, 其复制集由一个Primary和多个Secondary组成, Primary可以进行读写操作, Secondary回放Primary发送的oplog, 进行数据备份.

> 还有一种节点类型, 叫Arbiter, 仲裁者, 其主要负责选举投票, 而不进行数据备份, 也不能竞选Primary.

### 2.1. 典型的三节点部署

MogoDB主节点的选举条件是需要半数以上的投票节点投票, 一般节点数量都会设置为单数, 也就是2n+1, 该集群最多支持挂掉n个节点, 集群仍然能选出主节点并正常工作, 与2(n+1)个节点能够容忍的数量是一样的, 所以一般节点数(具有投票权)都是单数

![复制集](https://huija.github.io/images/replica-set-ps2.png)

> 三节点部署的问题在于, 没法应对机房的整体故障, 比如你有2个机房, 主机房部署了2个节点, 从机房部署了一个节点, 一般情况下, 是没有问题的, 但是当主机房整体故障, 2个节点全部下线, 只剩余从机房一个节点, 这时候无法选出Primary节点, 只能提供读, 不能提供写服务.

#### 2.1.1. 直接部署

> 前置学习[MongoDB入门](https://huija.github.io/mongodb-starter/), 下面的复制集部署十分简单.

主要步骤分为两步:

* 启动三个**mongod**实例, 我们单机模拟, 分别占用**28017,28018,28019**三个端口.
* **mongo shell**进入某个**mongod**实例, 初始化复制集集群.

配置三个实例的数据库集簇目录, 端口等

``` shell
cd ~/programs/mongodb-4.4.1
mkdir replica
cd replica
mkdir -p data/db{1,2,3}
touch replica_1.conf replica_2.conf replica_3.conf
```

每个配置的内容大致如下, 区别在集簇目录**db1**和端口**28017**上

``` yaml
storage:
  dbPath: /home/huijia/programs/mongodb-4.4.1/replica/data/db1
  journal:
    enabled: true
systemLog:
  destination: file
  logAppend: true
  path: /home/huijia/programs/mongodb-4.4.1/replica/data/db1/mongod.log
processManagement:
  fork: true
  pidFilePath: /home/huijia/programs/mongodb-4.4.1/replica/data/db1/mongod.pid
net:
  port: 28017
  bindIp: 0.0.0.0
replication:
  replSetName: replicaset
```

输好配置后分别启动三个实例, 相当于启动了三个互补相关的单节点MongoDB实例.

```` shell
mongod -f replica_1.conf
mongod -f replica_2.conf
mongod -f replica_3.conf
````

进入某个实例, 初始化复制集群(_id与之前配置文件内的**replSetName**必须一致)

``` shell
mongo localhost:28017
> rs.initiate({
      "_id": "replicaset",
      "members": [
          {
              "_id": 0,
              "host": "127.0.0.1:28017"
          },
          {
              "_id": 1,
              "host": "127.0.0.1:28018"
          },
          {
              "_id": 2,
              "host": "127.0.0.1:28019"
          }
      ]
  })
replicaset:PRIMARY> rs.status()
...
replicaset:PRIMARY> rs.config()
...
```

这样, 一个简单的复制集群就搭建好了.

> 实际隐藏了一个坑, 类似Kafka, 如果我们这边init的是ip, 那么客户端访问, 无论你设置的是ip还是域名, 到最后, 实际都是根据server返回的元数据进行访问, 也就是ip, 这一般没什么问题, 但是如果init的是域名, 那么客户端也会使用域名进行访问, 这时候, 一个内部全局可用的DNS服务, 是十分关键的, 当然, 这些也可以后面修改, 参考后面**节点设置**的tip.

#### 2.1.2. 设定鉴权

MongoDB一直被人误解, 安全性低, 实际上完全是误解, 其实MongoDB的鉴权类似K8S等系统, 使用的是RBAC的鉴权模型

> MongoDB节点间的校验是通过证书进行, 客户端访问节点则是RBAC鉴权.

``` shell
## 先mongo shell到primary节点创建管理员: 创建用户admin, 指定角色为root
> use admin
> db.createUser({user:"admin",pwd:"123456",roles:[{role:"root",db:"admin"}]})
> exit
## 关闭集群, 创建证书文件
pkill mongod
openssl rand -base64 753  > crt.key
chmod 400 crt.key
## 每个mongod进程的conf配置都追加证书配置
security:
  authorization: enabled
  clusterAuthMode: keyFile
  keyFile: path to crt.key
## 启动集群
mongod -f replica_1.conf
mongod -f replica_2.conf
mongod -f replica_3.conf
```

> 如果顺利, 这时候, 应该启动成功了, 不顺利, 就可以去查看一下mongod的日志文件, 错误排查.

鉴权进入, use不同DB, 创建细分user

``` shell
mongo $域名:28017 -u admin -p 123456 --authenticationDatabase admin
> use demo
> db.createUser({user:"demo",pwd:"imstupid",roles:[{role:"readWrite",db:"demo"}]})
> exit
mongo $域名:28017 -u demo -p imstupid --authenticationDatabase demo
> ...(进行读写就好)
```

## 3. Client/Server机制

MongoDB的本身是C/S模型, MongoDB客户端与节点直接通过RPC通信, 了解其中的交互细节, 对于排查问题, 是十分有益的.

### 3.1. Client机制

1. 获取节点信息: 客户端SDK会先从集群获取到各节点信息, SDK会进行记录, 并心跳保持一致
2. 连接池设置: 为每个节点维护连接池, 可以设定最小值与最大值, 每个连接的建立都会进行鉴权
3. 请求流程: 选择节点, 获取连接, 发起请求, 获得结果, 释放连接.

#### 3.1.1. 读写配置

主要涉及**writeconcern**, **readconcern**, **readpreference**三个配置项, 三者实际都是分布式意义.

> MongoDB虽然单机, 复制集, 分片集的API都是一样的, 但是最核心, 使用最多的还是复制集.

* writeconcern: 含义是写入确认, 可以理解为mq系统内的消息已提交, 其主要参数有**w,j**, 其中**w**表示数据写到了多少机器上, 才算写入成功, n台机器可配置成数字0-n, 但是不建议配数字, 可以配置`majority`和`all`, 分别代表**过半存活节点**和**所有存活节点**才算确认, **j**表示是否要写入journal日志才算写入, 推荐直接设置true即可.
* readconcern: 含义是读确认, 类似MySQL隔离级别, 从低到高: available(读到啥是啥)=>local(读未提交)=>majority(读已提交:可能读到旧的)=>snapshot(可重复读:事务开始快照)=>linearizable(线性读:等待更新提交), 相比常规RDBMS, 这种读写级别分开, 实际上, 很不适应, 其中available追求性能干掉了一致性, linearizable追求一致性却又可能一直阻塞.
* readpreference: 与前两者不同, 这个配置项, 配置的是去哪个节点读取数据, 也就是读写分离相关的配置, primary(主库读)=>primaryPreferred(主库偏好)=>secondary(从库读)=>secondaryPreferred(从库偏好)=>nearest(响应优先), 除了上述5个选项, 也可以给mongod进程打tag, 然后设置tag, 指定读取偏好, 类似K8S的Pod调度的Tag, MongoDB在Client驱动层实现了节点选择算法.

> 一般场景, 读写都配置成majority, 追求写性能, 则可以将writeConcern设置为1, 追求读性能, 则使用readconcern默认的local就可以了
> 虽然MongoDB支持事务, 但是事务就意味着锁, 意味着性能开销, 所以从模型设计时, 多文档的事务, 应当尽量避免掉, 当然, 如果必须要用, 也是能用的.

#### 3.1.2. ACID看Mongo集群

* A原子性: 1.x支持单表单文档.4.0支持多文档事务(Transaction).
* C一致性: writeConcern,readConcern配置一致性需求
* I隔离性: readConcern读级别设置
* D持久性: journal落盘和replicas备份

### 3.2. Server机制

1. 执行计划分析: 当请求过来, 先进行分析, 得出优解
2. 获取ticket: MongoDB内部的令牌桶机制, 一般根据硬件会动态变化, 进行并发限制
3. 执行请求: 加载索引/数据到缓存,检索后返回数据
4. 释放ticket
5. 如果是分片, 还需要额外进行不同分片的结果整合.

## 4. 节点选举

MongoDB的主节点选举, 类似Redis, 使用的是Raft协议.

### 4.1. CAP与BASE

CAP理论, 三者只能有其二, 不可能三者同时存在, 一般保留P, CA选一个.

* C: Consistency, 一致性, 多副本数据的一致性
* A: Availability, 可用性, 功能可用, 能较快的给与用户读写响应(成功/失败)
* P: Partition tolerance, 分区容错, 网络分区故障的情况下, 不发生脑裂

BASE理论则是对于CAP理论, 一个公认的平衡实现

* BA: Basically Available, 基本可用, 运行故障时损失部分可用度, 比如挂了一半以上或者选举中, 不能写入.
* S: Soft state, 软状态, 其实就是数据存在中间状态, 可以理解为异步复制代替同步复制.
* E: Eventually consistent, 最终一致性, 经历一定时间的软状态之后, 各个副本之间可以达到最终一致性.

> Paxos，Raft，ZAB等常见的分布式一致性算法都是符合BASE理论。

### 4.2. Raft协议

网上博客很多, 推荐在网站: <http://thesecretlivesofdata.com/raft/> 体验一下raft的选举流程, 直观地理解raft协议.

> 主要的相关概念: 节点状态(Leader-Candidate-Follower), 节点间心跳&两个超时(随机超时), 任期&拉票/投票&半数以上

### 4.3. 节点设置

通过下面的命令查看成员设置.

``` shell
replicaset:PRIMARY> rs.config().members
```

* host: ip/hostname : port
* hidden: 隐藏复制节点, 对外不可见, 优先级为 0(作用是存粹的备份)
* priority: 被投票为主节点的优先级, 0-10
* votes: 是否具有投票权, 默认1表示有, 设置为0, 就没有
* slaveDelay: 延迟固定时间后才对主节点进行备份(主要是防止误操作删除数据,也可以模拟网络延迟)
* tags: 前面readPreference可配置的, 读偏好tag
* arbiterOnly: 仅仲裁人, 默认false, 还得存出局
* buildIndexes: 是否创建索引

而配置的方法也十分直观, 使用js的语法即可, 比如修改某个节点的同步延迟, 以及选举优先级.

``` shell
replicaset:PRIMARY> conf=rs.conf()
replicaset:PRIMARY> conf.members[2].slaveDelay=5
replicaset:PRIMARY> conf.members[2].priority=0
replicaset:PRIMARY> rs.reconfig(conf)
```

### 4.4. 进阶: 两地三中心部署

两地三中心, 也就是在三个数据中心的基础上搭建MongoDB复制集, 其中两个主数据中心, 距离较近(同城市/省), 分别部署2个节点(高优先选举权), 最后一个数据中心距离较远(同国家),
部署一个从节点(低优先选举权).

对于一般情况下, 无论是读写, 都在靠近的两个数据中心流转, 而即使某个主要的数据中心下线, 还有3个节点, 相当于降级到了三节点部署, 也是没有问题的, 只有当两个机房同时出现下线, 才会导致不可用, 这基本已经属于极端的自然灾害场景了.

![两地三中心](https://huija.github.io/images/replica-set-ps4.png)

> 两地三中心, 基本可以说保证了5个9的SLA.

## 5. 集群监控

MongoDB集群支持自动failover, 但是监控是必不可少的.

### 5.1. MongoDB Ops Manager

最完善的MongoDB管理系统, 但是只有商业版本才提供.

### 5.2. 内置工具

* mongo shell内支持`db.serverStatus()`来查看节点的监控信息.

* mongodb安装包也带了一些命令: `mongostat`, `mongotop`, 两者名字一看就知道了, 前者是IO,内存监控, 后者是语句响应时间监控

### 5.3. 日志监控

mongod配置了日志文件, 可以配合`planSummary: COLLSCAN`等关键词, 监控慢查询.

> 上述是比较官方的监控方法, 也有一些三方工具如mtools等.

## 6. 总结

MongoDB复制集是MongoDB的核心架构, 是其最稳定, 最完善, 最核心的部分, 开源版本就直接支持.

* WriteConcern: <https://docs.mongodb.com/manual/reference/write-concern/>
* ReadConcern: <https://docs.mongodb.com/manual/reference/read-concern/>
* ReadPreference: <https://docs.mongodb.com/manual/core/read-preference/>
* Raft协议: <http://thesecretlivesofdata.com/raft/>
* MongoDB选举: <https://www.jianshu.com/p/916e5e443ad7>
* 复制集配置: <https://docs.mongodb.com/manual/reference/replica-configuration/>
* mtools: <https://github.com/rueckstiess/mtools>

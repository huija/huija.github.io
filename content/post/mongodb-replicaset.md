---
title: "Mongodb 复制集"
date: 2021-05-07T13:37:16+08:00
draft: true
tags: ["数据库","MongoDB","分布式"]
toc: true
---

# MongoDB复制集
MongoDB复制集是MongoDB分布式系统的核心.

> mongodb的api对于单点,复制集,分片集群都通用的, 这也就意味着, 改变底层架构, 对于代码基本无需改动.

## 浅谈复制集
先撇开MongoDB单独来讲复制集群, 顾名思义, 就是从原先的机器复制一份, 一起部署,
在分布式场景是很常见的部署架构, 以数据库们为例, 就有MySQL基于binlog的主从部署, 
PostgreSQL基于WAL日志的同步/异步流复制, Redis的主从复制等.

### 复制集的意义
* 复制集本身, 解决的根本问题是, 单机部署的单点故障问题, 当**主节点**挂掉, 可以转正**从节点**, 也就是数据冗余以及高可用.
* 衍生出来的, 是可以进行读写分流, 并针对读的流量进行横向扩展, 也就是可伸缩性与负载均衡.

### 复制集的问题
复制集的最核心的问题集中于消息从**主节点**到**从节点**的备份策略, 同步还是异步

* 如果同步备份, 那么会保证每个操作后, 主从的数据都是一致的, 也就是强一致性, 但是如果**从节点**挂了, 使用同步的策略, 那**主节点**的请求是否要返回失败, 这就涉及可用性的问题.
* 一般数据库的主流策略都是异步, 不追求数据的强一致性, 而是最终一致性, 重点保证可用性, 而实时性问题, 则通过一定手段进行避免.

## MongoDB复制集
MongoDB的主从叫Primary和Secondary, 其复制集由一个Primary和多个Secondary组成, Primary可以进行读写操作, Secondary回放Primary发送的oplog, 进行数据备份.

### 典型的三节点部署
主节点的选举条件是需要半数以上的投票节点投票, 一般节点数量都会设置为单数, 也就是2n+1, 
最多支持挂掉n个节点, 集群仍然能正常工作, 与2(n+1)个节点能够容忍的数量是一样的, 
所以一般节点数(具有投票权)都是单数

> 三节点部署的问题在于, 没法应对机房的整体故障, 比如你有2个机房, 主机房部署了2个节点, 
> 从机房部署了一个节点, 一般情况下, 是没有问题的, 但是当主机房整体故障, 2个节点全部下线, 
> 只剩余从机房一个节点, 无法选出Primary节点, 这时候只能提供读,不能提供写服务.

#### 直接部署
> 假设你你已经看过了[MongoDB入门](https://huija.github.io/mongodb-starter/), 那么下面的复制集部署其实并不难

主要步骤分为两步:
- 启动三个**mongod**实例, 我们单机模拟, 分别占用**28017,28018,28019**三个端口.
- **mongo shell**进入某个**mongod**实例, 初始化复制集集群.

配置三个实例的数据库集簇目录, 端口等
```shell script
cd ~/programs/mongodb-4.4.1
mkdir replica
cd replica
mkdir -p data/db{1,2,3}
touch replica_1.conf replica_2.conf replica_3.conf
```

每个配置的内容大致如下, 区别在集簇目录**db1**和端口**28017**上
```shell script
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

输好配置后可启动三个实例
````shell script
mongod -f replica_1.conf
mongod -f replica_2.conf
mongod -f replica_3.conf
````

进入某个实例, 初始化复制集群(_id与之前配置文件内的replSetName必须一致)
```shell script
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

#### 设定鉴权
MongoDB一直被人误解, 安全性低, 实际上完全是误解, 其实MongoDB的鉴权类似K8S等系统, 使用的是RBAC的鉴权模型

> MongoDB节点间的校验是通过证书进行, 客户端访问节点则是RBAC鉴权.

### 节点选举

#### Raft协议

#### 节点设置

### 进阶: 两地三中心部署
两地三中心, 也就是在三个数据中心, 其中两个数据中心, 距离较近(同城市/省), 分别部署2个节点, 最后一个数据中心距离较远(同国家),
部署一个从节点, 这样, 对于一般情况下, 无论是读写, 都在靠近的两个数据中心流转, 而即使某个主要的数据中心下线, 还有3个节点, 相当于降级到了三节点部署, 
也是没有问题的, 只有当两个机房同时出现下线, 才会导致不可用, 这基本已经属于极端的自然灾害场景了.

> 两地三中心, 基本可以说保证了5个9的SLA.

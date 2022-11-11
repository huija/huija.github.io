---
title: "JSON-RPC: a tale of interfaces"
date: 2022-11-10T11:40:17+08:00
draft: true
tags: ["go","go official blog"]
toc: true
---

# JSON-RPC: 接口的故事

## 原文信息

* 地址：[JSON-RPC: a tale of interfaces](https://go.dev/blog/json-rpc)
* 作者：Andrew Gerrand
* 时间：2010年4月27号

## 中文译文

这里（这篇文章）我们提供一个例子，Go的[interfaces](https://go.dev/doc/effective_go.html#interfaces_and_types)
重构代码后会让代码更加灵活并具有更好的拓展性。

最初，标准库里面的[RPC package](https://go.dev/pkg/net/rpc/)使用了一个叫[gob](https://go.dev/pkg/encoding/gob/)
的自定义连接（传输）格式。对于一个特定的应用，我们希望能使用[JSON](https://go.dev/pkg/encoding/json/)作为一个可选连接（传输）格式。

我们先定义了一对interface去描述存在的连接（传输）格式，一个给到客户端，一个给到服务端(如下所示)。

```go
type ServerCodec interface {
ReadRequestHeader(*Request) error
ReadRequestBody(interface{}) error
WriteResponse(*Response, interface{}) error
Close() error
}
```

在服务端代码，我们将两个内部方法的声明进行改变，输入参数从之前的`gob.Encoder`变为`ServerCodec`。下面就是其中一个内部方法。

```go
func sendResponse(sending *sync.Mutex, req *Request, reply interface{}, enc *gob.Encoder, errmsg string)
```

修改后

```go
func sendResponse(sending *sync.Mutex, req *Request, reply interface{}, enc ServerCodec, errmsg string)
```

然后我们编写了一个简单的`gobServerCodec`代码块来再现原来的功能。并基于此很容易构建了
`jsonServerCodec`。

在对客户端代码进行了类似的改造后，我们完成了需要在RPC包上做的全面工作。

整个练习耗费大概20分钟！在整理测试新代码后，最终的[代码修改](https://github.com/golang/go/commit/dcff89057bc0e0d7cb14cf414f2df6f5fb1a41ec)
被提交

在Java或c++等面向继承的语言中，比较容易想到的方法是，泛化RPC类，并创建JsonRPC和GobRPC子类。但是，如果您想进一步泛化该层次结构，则此方法将变得棘手。（例如，你需要实现一个替代的RPC标准）。在Go包中，我们采用了一种概念上更简单、需要编写或更改的代码更少的方法。

> 其实就是组合相比继承的优点，但是翻译过来感觉有点说的简单了。

任何代码库的一个重要品质都是可维护性。随着需求的变化，很有必要把代码适配得轻松、干净，以免它变得难以阅读和工作。我们相信Go的轻量级、面向组合的类型系统提供了一种构建可伸缩代码的方法。

**Next article:**[New Talk and Tutorials](https://huija.github.io/tags/go-official-blog/)\
**Previous article:**[Third-party libraries: goprotobuf and beyond](https://huija.github.io/go-protobuf/)\
**[Blog Index](https://huija.github.io/tags/go-official-blog/)**

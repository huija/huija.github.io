---
title: "Third-party libraries: goprotobuf and beyond"
date: 2010-04-20T12:00:00+08:00
draft: true
tags: ["go","go official blog"]
toc: true
---

# 第三方库: goprotobuf及以后

## 原文信息

* 地址：[Third-party libraries: goprotobuf and beyond](https://go.dev/blog/protobuf)
* 作者：Andrew Gerrand
* 时间：2010年4月20号

## 中文译文

（2010年）3月24号，Rob Pike发布了[goprotobuf](http://code.google.com/p/goprotobuf/)
，是谷歌数据交换格式[Protocol Buffers](http://code.google.com/apis/protocolbuffers/docs/overview.html)的Go语言实现，Protocol
Buffers简称protobufs。随着goprotobuf的发布，Go加入了c++、Java和Python的行列，成为官方提供protobuf实现的语言之一。这是一个重要里程碑，标志着能够实现现有系统和Go构建的系统之间的互操作性。

goprotobuf项目包含两个部分：一个是“协议编译器插件（protocol compiler plugin）”，用于生成Go的源码文件，编译后（的代码）可以访问和管理协议缓存区；另一个是Go
package, 对编解码以及访问协议缓存区提供了运行时的支持。

想要使用goprotobuf的话，你首先需要同时安装Go和[protobuf](http://code.google.com/p/protobuf/)
。然后你可以通过[goinstall](https://go.dev/cmd/goinstall/)来安装“proto”这个packge：

```bash
goinstall goprotobuf.googlecode.com/hg/proto
```

接着安装"protocol compiler plugin"：

```bash
cd $GOROOT/src/pkg/goprotobuf.googlecode.com/hg/compiler
make install
```

更多细节参考项目的[README](http://code.google.com/p/goprotobuf/source/browse/README)文件。

goprotobuf是不断增长的第三方Go项目列表中的一个。在goprotobuf发布之后，`X
Go`绑定已经从标准库分离到[x-go-binding](http://code.google.com/p/x-go-binding/)
项目，并且已经开始了一个[Freetype](http://www.freetype.org/)的项目[freetype-go](http://code.google.com/p/freetype-go/)
。还有（很多）其他流行的第三方项目，包含轻量化的web框架[web.go](http://github.com/hoisie/web.go)
，Go语言的GTK（接口）绑定库[gtk-go](http://github.com/mattn/go-gtk)。

我们希望鼓励开源社区开发其他有用的软件包。如果你有正在做的工作，请不要藏在自己的心里 -
联系我们的邮件列表[golang-nuts](http://groups.google.com/group/golang-nuts)让我们知道吧。

**Next article:**[JSON-RPC: a tale of interfaces](https://huija.github.io/go-json-rpc/)\
**Previous article:**[Go: What's New in March 2010](https://huija.github.io/go-hello-world/)\
**[Blog Index](https://huija.github.io/tags/go-official-blog/)**
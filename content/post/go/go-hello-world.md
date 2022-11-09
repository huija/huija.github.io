---
title: "Go: What's New in March 2010"
date: 2022-11-06T00:18:31+08:00
draft: true
tags: ["go","go official blog"]
toc: true
---

# Go: 2010年3月有什么新消息

## 原文信息

* 地址： [Go: What's New in March 2010](https://go.dev/blog/hello-world)
* 作者：Andrew Gerrand
* 时间：2010年3月18号

## 中文译文

欢迎来到Go的官方博客。我们（Go团队）希望通过发布这些博客，让全世界了解到关于Go编程语言的最新开发状况以及围绕Go语言不断成长的最新生态和应用。

Go发行（2009年11月）已经过去几个月了，所以让我们谈谈自那以后，Go的世界发生了什么。

谷歌的核心团队继续开发语言、编译器、包、工具和文档。编译器现在生成的代码在某些情况下比首次release时快1到2倍。我们已经将一些Benchmark的性能测试图表和编译状态放在一起，来追踪每一个对于Go语言的更改的可靠性。

我们对语法进行了修改，使语言更加简洁、规范和灵活。分号在Go语言内[基本被全部删除](https://groups.google.com/g/golang-nuts/c/XuMrWI0Q8uk?pli=1)
。[…T](https://go.dev/ref/spec#Function_types)语法能够更容易地处理任意数量的方法参数。`x[lo:]`
切片语法，现在是`x[lo:len(x)]`的缩写。Go现在也原生支持复数。查看[release notes](https://go.dev/doc/devel/release.html)
获取更多信息。

[Godoc](https://go.dev/cmd/godoc/)现在能更好地支持第三方库，并且有一个新的工具
-[goinstall](https://go.dev/cmd/goinstall)-
已经被发布，它能够让使用者更简单地安装这些第三方库。此外，我们也开始开发一个package的跟踪系统，来更轻松地找到你需要的库。你可以在[Packages page](http://godashboard.appspot.com/package)
看到这些包的开始部分。

超过4w行的代码已经被加入到了[标准库](https://go.dev/pkg/)内， 包括许多全新的packages，其中相当一部分的代码是由外部贡献者编写。

说到第三方，自从我们的[邮件列表](http://groups.google.com/group/golang-nuts/)和irc频道（#go-nuts on
freenode）启动以来，一个充满活力的社区已经蓬勃发展了起来。我们正式为这个项目增加了50多人。他们的贡献包括从bug修复和文档更正到核心包的编写和对其他操作系统的支持（Go目前支持FreeBSD,
并且Windows的适配也正在处理）。我们认为这些社区贡献是迄今为止最成功的（一趴）。

我们也收到了一些好评。这篇[recent article in PC World](http://www.pcworld.idg.com.au/article/337773/google_go_captures_developers_imaginations/)
总结了围绕该项目的热情。一些博客朋友已经开始记录他们之于这门语言的体验(比如 [这里](http://golang.tumblr.com/0)
, [这里](http://www.infi.nl/blog/view/id/47)
,还有 [这里](http://freecella.blogspot.com/2010/01/gospecify-basic-setup-of-projects.html))
。总体上我们的用户的反映非常积极，一个初学者评论道[“I came away extremely impressed. Go walks an elegant line between simplicity and power."](https://groups.google.com/group/golang-nuts/browse_thread/thread/5fabdd59f8562ed2)
。

至于未来：我们已经听取了无数的声音告诉我们他们需要什么，现在正专注于让Go准备好迎接高光时刻。我们正在改进垃圾收集器、运行时调度程序、工具链和标准库，并探索新的语言特性。2010年对Go来说将是激动人心的一年，我们期待着与社区合作，使它成为一个成功的一年。

**下一篇文章：**[Third-party libraries: goprotobuf and beyond](https://huija.github.io/tags/go-protobuf/)\
**[博客地址](https://huija.github.io/tags/go-official-blog/)**
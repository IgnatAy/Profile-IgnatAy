# Ignat · Personal website

此仓库是已验证的纯静态发布副本。源码在本地 personal_profile 开发目录维护。

在开发目录运行 `pnpm release:pages`，完成类型检查、构建、资源验证并同步本目录；`pnpm check:release` 可检查是否与当前构建一致。同步前会在开发目录 work/pages-releases 中备份原发布文件。

GitHub Pages 可通过本仓库 Actions 工作流发布，也可从 main 分支根目录发布。不要在此安装依赖或重新构建。

构建时间：2026-09-09T10:23:30.462Z

源码校验值：`46052c2d6cf96dc5dd7f4db8dc63e6b29ca8b95eabe680928023b4ee2f1cba09`

`release-manifest.json` 记录整份静态站点的文件校验值，Actions 会在发布前验证。

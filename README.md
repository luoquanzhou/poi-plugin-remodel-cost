# poi-plugin-remodel-cost

poi 的改造资源统计插件。按舰种筛选母港舰船，为每艘船指定目标形态，汇总改造所需的燃料、弹药与特殊资材，并与当前持有量对比。

## 功能

- **舰种两级筛选**：大类（战舰 / 空母 / 重巡 / 轻巡 / 驱逐 / 潜艇 / 海防 / 辅助舰艇）→ 小类，均可多选
- **逐艘指定目标形态**：同一艘船的不同改造分支（改二 / 改二乙 / 改二丁…）分开计算，默认选到链条末端
- **成本累加**：多段改造按跳数累加燃料、弹药与全部特殊资材
- **持有量对比**：读取游戏内道具数量，缺口标红
- **标记**：不需要 / 已完成的船标记后隐藏，可展开查看、随时取消
- **状态持久化**：勾选、目标形态、筛选条件写入 poi config，重启后恢复
- **等级提示**：显示当前等级与目标形态的等级要求，未达标标注差值

## 数据来源

| 数据 | 来源 |
| --- | --- |
| 等级 / 燃料 / 弹药 / 改造链 | 游戏 API `api_start2`（运行时从 poi 的 store 读取，始终最新） |
| 特殊资材需求 | kcwiki [模块:舰娘数据](https://zh.kcwiki.cn/wiki/模块:舰娘数据) 快照，内置于 `costs.js` |
| 道具图标 | kcwiki 上传的游戏素材，base64 内嵌于 `icons.js` |

`costs.js` 是快照（2026-11-05），游戏新增改造后需要重新生成。

## 安装

1. 把整个目录放到：

```
%APPDATA%\poi\plugins-extra\node_modules\poi-plugin-remodel-cost\
```

2. 重启 poi

3. 标签栏若没有「改造资源」，点标签栏右侧的下拉菜单启用

> 放进 `plugins-extra` 而不是 `plugins`，是为了避免 poi 的插件管理在更新时把它清理掉。

## 开发

插件运行在 poi 的渲染进程里，直接 `require` poi 内部模块：

```js
const { stateSelector, shipsSelector, constSelector } = require('views/utils/selectors')
const { Avatar } = require('views/components/etc/avatar')
```

改完代码后，在 poi 的 DevTools 控制台执行热重载：

```js
window.reloadPlugin('poi-plugin-remodel-cost')
```

调试时可以带 `--remote-debugging-port=9222` 启动 poi，用 CDP 读取 store、截图。

## 已知限制

- 特殊资材数据是快照，新船需要手动更新 `costs.js`
- 只统计改造（改一/改二/改三等），不含装备改修的消耗
- 改装设计图 / 战斗详报等以游戏道具 id 读取，若游戏改动道具 id 需要更新 `icons.js` 与 `MATERIAL_SOURCE`

## 许可

代码 MIT。

`icons.js` 内的图标为《舰队Collection》游戏素材，来源 [kcwiki](https://zh.kcwiki.cn/)，版权归原权利方所有，仅作个人工具使用。

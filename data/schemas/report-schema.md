# ReportWebShow Demo 数据结构

Demo 阶段使用 YAML 保存基础数据和用户补丁。

## 汇报项目

- `report.id` 必须等于文件名中的 `report_id`。
- `story_tree.nodes` 保存叙事树。
- `pages` 中每个 `node_id` 对应一个呈现页。
- `svg_assets` 保存 SVG 资源引用，不直接保存 SVG 文件内容。

## 补丁项目

- `current_revision` 表示当前展示版本。
- `revisions[].parent_revision` 表示 revision 父链。
- 前端展示按 `ancestor_chain(current_revision)` 依次应用 changes。

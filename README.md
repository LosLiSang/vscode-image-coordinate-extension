# Image Coordinate Viewer

用十字准线 + 实时坐标的方式打开图片。

## 功能
- 鼠标移动时显示**原图像素坐标**（自动换算缩放比例）
- **十字准线**跟随鼠标（`imageCoordinateViewer.crosshair` 开关）
- **悬浮提示**显示 `(x, y)` 与像素颜色（HEX）
- **点击复制**：坐标 / 颜色 / 两者（`imageCoordinateViewer.clickToCopy`: `off|coords|color|both`）
- 状态栏同步显示坐标，点击状态栏可复制最近坐标
- **Ctrl+滚轮**自由缩放，左上角显示原始尺寸与缩放百分比
- 初始缩放模式：适应窗口 / 100% 原始大小（`imageCoordinateViewer.zoomMode`）

支持 png / jpg / jpeg / bmp / gif / webp。

## 使用
1. `npm install`
2. F5 启动 Extension Development Host
3. 在资源管理器中右键图片 → **Open With...** → **Image Coordinate Viewer**
   （priority 为 `option`，不会抢占默认图片查看器）

## 打包
```
npx vsce package
```

# 人物素材与当前播放方式

用户原始照片和视频保持不变。网站使用个人牛仔穿搭人物，没有借用参考网站作者的人像。

| 用途 | 当前资源 | 来源 / 处理 |
| --- | --- | --- |
| 稳定等待 | `assets/motion/neutral.webp` | 停用短视频反复重启造成的待机抖动 |
| 首页口型 | `assets/lipsync/chapters-home.mp4` | 用户 `b547d3db…mp4` 身体动作 + 选定欢迎配音 + 本地 Wav2Lip |
| 其余四页和十个话题 | `assets/lipsync/*.mp4` | 用户 `772376c7…mp4` 身体动作 + 同名完整配音 + 本地 Wav2Lip |
| 行走 | `assets/motion/walk-smooth.mp4` | 用户 `40f8647a…mp4`；选段、头部稳定、尺度平滑、60 fps |
| 跑步 | `assets/motion/run-clean.mp4` | 用户 `964f45bd…mp4` 的 3.042–3.458 秒；原始帧，无光流补帧，统一降至 20 fps，32 次同相位循环 |
| 点击反馈 | `assets/motion/acknowledge.mp4` | 用户欢迎视频的点头片段 |
| 情境动作 | `assets/actions/{nod,look,invite,show,goodbye}.mp4` | 用户欢迎/讲解原片的短动作；用于导览衔接、点头回应和告别 |

`assets/lipsync/manifest.json` 记录每段生成视频对应音频的 SHA256、帧率及长度；`assets/motion/smooth-gait-manifest.json` 记录实际步态选段。讲解视频静音，只保留一条旁白通道，Canvas 去除绿幕。模型口型视频完整缓存后按音频时间轴播放，支持准确暂停和跳句；自然换句不重启。

本地模型为 [Wav2Lip 官方仓库](https://github.com/Rudrabha/Wav2Lip) README 链接的 Wav2Lip + GAN checkpoint，在 CPU 上通过 TorchScript 推理。该开源版本限个人、研究和非商业用途；此处用于用户个人网站。模型与依赖未打包到网页，原始素材没有上传用于本轮生成。

口型只融合下半脸区域，身体与手势来自已有素材。不会任意生成新的全身动作；模型侧脸细节及步态拼接仍有局限。系统的“减少动态效果”偏好生效时，媒体失败时回退到稳定站姿。

当前复现和测试入口见 `../UPGRADE.md`。早期 `presenter-walker.js`、关节拉伸动画和单句 MP3 保留为历史文件，不再由 `site/index.html` 加载。

## 跑步腿部跳变修正 · 2026-09-20

旧 run-smooth 的循环边界发生腿部复位，光流补帧又引入鞋子/裤腿重影。当前仅替换跑步片段，不重制讲解或行走素材。新循环优先匹配腿部轮廓、白鞋位置与运动方向，尺度使用连续线性趋势，不随抬脚调整身体大小。移速系数由 1.5 改为 1.1，仍以视频时间驱动位移。

复现：tools/rebuild-run-cycle.py；清单：assets/motion/run-clean-manifest.json。tools/check-running-cycle.cjs 已通过连续跑动、无自发镜像、位移无跳跃、打断与回到待机检查。checks/run-boundary-comparison.json 中接缝变化/普通帧变化中位数，从旧片的 2.33 降为 0.79；不同帧率的绝对逐帧差异不作直接优劣比较。新片未合成中间腿部形状，保留源片的动作和 20 fps 播放节奏。

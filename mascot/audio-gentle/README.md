# 温和、松弛的欢迎语试音

此版现已停用：用户最终选择 `../audio-natural/welcome-preview.wav`。本目录只保留试音历史。

2026-09-20 用户希望声音更柔和，贴近文艺男声。保留上一版的音色来源，把整段欢迎语作为新的 ICL 参考；参考音频的 3.2 kHz 附近减弱 2.5 dB，高频搁架减弱 1.5 dB，使用保留音高的 0.94 倍节奏处理，然后以 Qwen3-TTS-12Hz-1.7B-Base 重新生成整段台词。没有给不支持情绪指令的 Base 模型伪造“文艺男”控制参数。

生成记录：工作区 `drafts/voice-clone/gentle-audition/generation.json`。新生成的原始音频约 9.2 秒；网站版本只统一增益，目标 RMS 0.055（低于上一版的 0.07），保留动态和停顿，不对新生成的成品变调或变速。

`welcome-preview.wav` 为完整试听；三句 MP3 在自动转写后核对的停顿中截取，切点为 3.37、7.23 秒，192 kbps。机器转写可核对正文与时间，但姓名同音字和听感仍需人工判断。自然度、温柔感和是否符合“文艺男”是试听判断，不能由模型或播放测试证明。

仅更新欢迎页，其他页面尚未批量替换。上一版仍在 `../audio-natural/`，原先版本在 `../audio-clone/`。现有视频没有重新生成口型。

复现：依次使用项目语音环境运行 `tools/create-gentle-welcome.py`、`tools/inspect-natural-audition.py --source drafts/voice-clone/gentle-audition/welcome-generated.wav`、`tools/connect-gentle-home.py --cuts 3.37 7.23`。重新生成后必须重查切点。

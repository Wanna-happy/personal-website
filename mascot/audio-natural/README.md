# 欢迎语音质改版 · 用户已选定

用户已明确选择此目录的 `welcome-preview.wav`，作为正式音色基准。欢迎页使用本目录原有三句 MP3；不重新生成、不改变所选 WAV 或 MP3。后续内容使用这段完整声音与对应台词作为固定生成参考。

用户否定了上一版 0.6B 音色的自然度。当前欢迎页改用 Qwen3-TTS-12Hz-1.7B-Base，以 `fb65837d-14e8-4591-8119-2dd14af0e5e8.mp4` 前 3.2 秒的“跟我来”为参考，使用参考语音编码与台词的 ICL 模式，整段生成欢迎词。较大模型和 ICL 是生成方式的改进，不构成人工听感已经通过的证明。

`welcome-preview.wav` 是整段试听。网页的三句 MP3 从这次完整生成中按实际停顿截取，不再逐句独立生成。仅统一一次整段增益，不做变调、变速或降噪，MP3 192 kbps。剪辑点及来源写入 `manifest.json`。

其他章节的统一配音保存到 `../audio-selected/`；旧模型记录在 `../audio-clone/README.md`。现有动作视频仍未做逐音素口型同步。

复现：先运行 `tools/try-natural-voice.py --reference guide`，再运行 `tools/inspect-natural-audition.py` 核对台词和时间，最后 `tools/connect-natural-home.py`。均使用项目的 `tools/voice-runtime/Scripts/python.exe`。

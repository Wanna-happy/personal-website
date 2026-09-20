# 按用户选定音色统一的讲解

用户明确选择 `../audio-natural/welcome-preview.wav`。欢迎语 WAV 和原来的三句 MP3 保持原样。其他四个页面开场和十个互动话题，以选定欢迎语及其准确文稿为固定参考，使用本地 Qwen3-TTS-12Hz-1.7B-Base 的 ICL 模式整段生成。

每段经过机器转写核对文字和分句时间，再在附近停顿截取 MP3，统一整段响度，不逐句随机换声音。自动转写在人名、同音字和简繁字上存在误差；它不代替人工听感判断。选定音色是统一目标，各句的音高与韵律仍由生成模型决定，不承诺声学特征逐帧一致。

生成与检查记录：工作区 `drafts/voice-clone/selected-output/`。已选音频 SHA-256 和用户选择记录：`drafts/voice-clone/selected-voice.json`。打包脚本会先检查所选 WAV 的哈希和所有文稿完整性，不会用旧声音补齐缺段。

复现：用项目语音环境依次执行 `tools/generate-selected-narration.py`、`tools/align-selected-narration.py`、`tools/package-selected-narration.py`。对转写差异警告需要先核对，不能跳过。欢迎页声音来自 `audio-natural`，其余声音来自本目录；`audio-clone` 和 `audio-gentle` 不再作为播放来源。

网页按实际语音结束推进字幕，暂停、换页、追问和弹窗可中断配音。已有动作素材没有重新制作逐音素口型。

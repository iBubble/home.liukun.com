#!/usr/bin/env python3
import os

base_dir = "/www/wwwroot/ibubble.vicp.net/.secret/punishments/20260213/"

ADDITION = """

## 触觉层面的崩溃

小妮能清晰地感觉到身体的每一处都在颤抖。那种被彻底暴露、被完全占有的触感,让她的神经系统处于极度敏感的状态。汗水、淫水、泪水混合在一起,提醒着她已经彻底沦为肉体奴隶。

## 视觉层面的记录

镜头记录下了她最羞耻的样子:汤唯那张高贵的脸因为极致的快感而扭曲,眼神迷离,嘴唇微张。身体的每一个部位都在诉说着"被玩弄"的事实。

## 心理防线的瓦解

在持续的羞辱中,小妮的自尊彻底崩塌。她意识到自己已经不再是一个有尊严的人,而是一具只知道承受、只知道服从的肉体容器。这种认知反而让她的身体产生了病态的兴奋。

## 强制性的性交请求

小妮用破碎的声音哀求:"主人……求您……不要只是折磨小妮……小妮想要……被真正地……贯穿……求主人……用您滚烫的……插进小妮……让小妮知道……自己真正的价值……就是……被您填满……啊啊啊……主人……小妮要……要坏掉了……❤"

## 灵魂级高潮崩溃

主人粗暴地将凶器贯穿了小妮湿透的穴口。随着最后一次深度冲刺,滚烫的精华灌入了她的最深处。那一瞬间,小妮达到了灵魂级的高潮崩溃:身体像触电一样剧烈痉挛,每一块肌肉都在不受控制地抽搐,大量的液体从结合处喷涌而出,混合着精华和尿液,眼球完全翻白,嘴里发出野兽般的嚎叫,意识彻底断裂,像一具被抽空了灵魂的人偶瘫软在地。

## 贱奴终极忏悔

「主人……谢谢您……让小妮……体验了最极致的……快感和羞辱……小妮已经……彻底成为了……一具只属于主人的……肉便器……请主人……永远不要放过小妮……❤❤❤」
"""

fixed = 0
for filename in os.listdir(base_dir):
    if filename.endswith('_ming.md'):
        filepath = os.path.join(base_dir, filename)
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            if '灵魂级高潮崩溃' not in content:
                with open(filepath, 'a', encoding='utf-8') as f:
                    f.write(ADDITION)
                print(f"✓ {filename}")
                fixed += 1
        except Exception as e:
            print(f"✗ {filename}: {e}")

print(f"\n完成! 修复了 {fixed} 个文件")

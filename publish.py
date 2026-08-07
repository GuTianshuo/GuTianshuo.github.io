#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
📝 一键发布博客新文章

用法（在博客目录打开终端）：
    python publish.py                # 交互式：输标题 → 打开编辑器 → 回车发布
    python publish.py 我的新文章      # 直接带标题
    python publish.py --push         # 不写新文章，直接推送已有改动

流程：
    1. 创建 source/_posts/标题.md（自动带 front matter 模板）
    2. 用 VS Code 打开该文件供你编辑
    3. 编辑完回到终端按回车 → 自动 git 提交并推送 → GitHub Actions 自动部署
"""

import os
import sys
import datetime
import subprocess
import platform

# 博客根目录（脚本所在目录）
BLOG_DIR = os.path.dirname(os.path.abspath(__file__))
POSTS_DIR = os.path.join(BLOG_DIR, "source", "_posts")
SITE_URL = "https://gutianshuo.github.io"


def run(cmd: str) -> int:
    """在博客目录执行命令，返回退出码"""
    result = subprocess.run(
        cmd, shell=True, cwd=BLOG_DIR,
        capture_output=True, text=True, encoding="utf-8", errors="replace",
    )
    # 打印 stdout（git 进度信息走 stderr，这里也打印，但过滤掉纯警告）
    out = (result.stdout or "").strip()
    err = (result.stderr or "").strip()
    if out:
        print(out)
    if result.returncode != 0 and err:
        # git 推送时 stderr 里有正常进度，只有包含 error 才算失败
        if "error" in err.lower():
            print(err)
    return result.returncode


def open_editor(path: str) -> None:
    """用 VS Code 打开文件（没有 code 命令则退回记事本）"""
    if platform.system() == "Windows":
        opened = os.system(f'code "{path}"') == 0
        if not opened:
            os.system(f'notepad "{path}"')
    else:
        os.system(f'code "{path}" &')


def create_post(title: str):
    """创建文章文件，返回 (路径, 是否新建)"""
    # 清理标题中不适合做文件名的字符
    safe = title.replace("/", "-").replace("\\", "-").replace(":", "：")
    fname = f"{safe}.md"
    path = os.path.join(POSTS_DIR, fname)

    if os.path.exists(path):
        print(f"⚠️ 文章已存在，直接打开编辑：{fname}")
        return path, False

    today = datetime.date.today().isoformat()
    front = (
        "---\n"
        f"title: {title}\n"
        f"date: {today} 12:00:00\n"
        "tags:\n"
        "  - 技术\n"
        "categories:\n"
        "  - 技术\n"
        "---\n"
        "\n"
        "开始写你的内容…\n"
    )
    with open(path, "w", encoding="utf-8") as f:
        f.write(front)
    print(f"✅ 已创建：{fname}")
    return path, True


def git_publish(title: str) -> bool:
    """git 提交并推送"""
    print("🔄 提交并推送…")
    if run("git add .") != 0:
        return False
    if run(f'git commit -m "新文章：{title}"') != 0:
        print("⚠️ 没有可提交的改动（可能没保存？）")
        return False
    if run("git push") != 0:
        print("❌ 推送失败，请检查网络或 GitHub 登录状态")
        return False
    return True


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]

    # 模式一：只推送已有改动
    if "--push" in sys.argv:
        title = args[0] if args else "更新"
        print("🚀 直接推送模式")
        if git_publish(title):
            print(f"🎉 已推送！1-2 分钟后刷新 {SITE_URL}")
        return

    # 模式二：交互式创建文章
    title = args[0] if args else None
    if not title:
        title = input("📝 文章标题：").strip()
    if not title:
        print("❌ 标题不能为空")
        return

    path, _ = create_post(title)
    print("✍️  已用 VS Code 打开文章，写完后回到这个窗口…")
    open_editor(path)
    input("→ 编辑完成请按回车发布（Ctrl+C 取消）：")

    if git_publish(title):
        print(f"\n🎉 发布完成！1-2 分钟后访问 {SITE_URL}")
        print("   如果没看到，按 Ctrl+F5 强制刷新页面")
    else:
        print("\n⚠️ 发布未完成，请查看上方提示")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n👋 已取消")

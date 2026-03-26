#!/usr/bin/env python3
"""
BizyAir2OpenAI 自动化测试脚本
测试登录、仪表盘、设置、应用管理页面
"""

from playwright.sync_api import sync_playwright
import sys

BASE_URL = "http://localhost:3000"

def test_login(page):
    """测试登录功能"""
    print("测试登录页面...")
    page.goto(f"{BASE_URL}/login")
    page.wait_for_load_state("networkidle")

    # 截图保存
    page.screenshot(path="/tmp/login.png", full_page=True)

    # 检查登录表单是否存在
    password_input = page.locator('input[type="password"]')
    if password_input.count() > 0:
        print("  ✓ 登录表单存在")
        password_input.fill("admin123")
        page.locator('button[type="submit"]').click()
        page.wait_for_load_state("networkidle")
        page.screenshot(path="/tmp/after_login.png", full_page=True)
        print("  ✓ 登录已提交")
        return True
    else:
        print("  ✗ 未找到密码输入框")
        return False

def test_dashboard(page):
    """测试仪表盘"""
    print("测试仪表盘...")
    page.goto(f"{BASE_URL}/dashboard")
    page.wait_for_load_state("networkidle")
    page.screenshot(path="/tmp/dashboard.png", full_page=True)
    print("  ✓ 仪表盘页面已加载")

def test_settings(page):
    """测试设置页面"""
    print("测试设置页面...")
    page.goto(f"{BASE_URL}/settings")
    page.wait_for_load_state("networkidle")
    page.screenshot(path="/tmp/settings.png", full_page=True)

    # 检查 API Key 显示
    api_key_display = page.locator("text=代理 API Key")
    if api_key_display.count() > 0:
        print("  ✓ 设置页面加载正常")

    # 检查是否有复制按钮
    copy_btn = page.locator('button[title="复制 API Key"]')
    if copy_btn.count() > 0:
        print("  ✓ API Key 复制按钮存在")

def test_apps(page):
    """测试应用管理页面"""
    print("测试应用管理页面...")
    page.goto(f"{BASE_URL}/apps")
    page.wait_for_load_state("networkidle")
    page.screenshot(path="/tmp/apps.png", full_page=True)
    print("  ✓ 应用管理页面已加载")

    # 检查是否有添加应用按钮
    add_btn = page.locator("text=添加应用")
    if add_btn.count() > 0:
        print("  ✓ 添加应用按钮存在")
        add_btn.click()
        page.wait_for_load_state("networkidle")
        page.screenshot(path="/tmp/app_form.png", full_page=True)
        print("  ✓ 应用表单已打开")

def test_test_page(page):
    """测试 API 测试页面"""
    print("测试 API 测试页面...")
    page.goto(f"{BASE_URL}/test")
    page.wait_for_load_state("networkidle")
    page.screenshot(path="/tmp/test_page.png", full_page=True)
    print("  ✓ 测试页面已加载")

def test_console_errors(page):
    """检查控制台错误"""
    print("检查控制台错误...")
    errors = []

    def handle_console(msg):
        if msg.type == "error":
            errors.append(msg.text)

    page.on("console", handle_console)
    page.goto(f"{BASE_URL}/dashboard")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)  # 等待一段时间捕获延迟的错误

    if errors:
        print(f"  ⚠ 发现 {len(errors)} 个控制台错误:")
        for err in errors[:5]:  # 只显示前5个
            print(f"    - {err[:100]}...")
    else:
        print("  ✓ 无控制台错误")

def main():
    print("=" * 50)
    print("BizyAir2OpenAI 自动化测试")
    print("=" * 50)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()

        try:
            # 先登录
            if not test_login(page):
                print("登录失败，尝试直接访问其他页面...")
                # 继续测试其他页面

            # 测试各个页面
            test_dashboard(page)
            test_settings(page)
            test_apps(page)
            test_test_page(page)

            # 检查控制台错误
            test_console_errors(page)

            print("\n" + "=" * 50)
            print("测试完成！截图已保存到 /tmp/")
            print("  - /tmp/login.png")
            print("  - /tmp/dashboard.png")
            print("  - /tmp/settings.png")
            print("  - /tmp/apps.png")
            print("  - /tmp/test_page.png")
            print("=" * 50)

        except Exception as e:
            print(f"\n✗ 测试出错: {e}")
            page.screenshot(path="/tmp/error.png", full_page=True)
            sys.exit(1)
        finally:
            browser.close()

if __name__ == "__main__":
    main()

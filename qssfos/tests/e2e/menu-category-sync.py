import asyncio, json, os, time, urllib.request
from pathlib import Path
from playwright.async_api import async_playwright

S = Path(__file__).parent / "screenshots"; S.mkdir(exist_ok=True)
NAME = f"E2E Cat {int(time.time())}"
API_KEY = os.environ["CONSUMER_API_KEY"]

def public_menu(slug):
    req = urllib.request.Request(f"http://localhost:8080/api/public/menu?slug={slug}", headers={"x-api-key": API_KEY})
    return json.load(urllib.request.urlopen(req))

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(headless=True)
        ctx = await b.new_context(viewport={"width":1280,"height":1800})
        for c in json.loads(os.environ["LOVABLE_BROWSER_SUPABASE_COOKIES_JSON"] or "[]"):
            c["url"] = "http://localhost:8080"
            await ctx.add_cookies([c])
        page = await ctx.new_page()
        await page.goto("http://localhost:8080")
        await page.evaluate(f'window.localStorage.setItem({json.dumps(os.environ["LOVABLE_BROWSER_SUPABASE_STORAGE_KEY"])}, {json.dumps(os.environ["LOVABLE_BROWSER_SUPABASE_SESSION_JSON"])})')
        await page.goto("http://localhost:8080/menu", wait_until="domcontentloaded")
        await page.wait_for_timeout(4000)
        await page.screenshot(path=str(S/"1_menu.png"))
        print("url:", page.url)
        # open add item dialog
        await page.get_by_role("button", name="Add item").first.click()
        await page.wait_for_timeout(800)
        await page.screenshot(path=str(S/"2_dialog.png"))
        print("dialog text:", (await page.locator("[role=dialog]").inner_text())[:500])
        # fill item
        d = page.locator("[role=dialog]")
        await d.get_by_placeholder("Signature dish").fill(f"E2E Item {int(time.time())}")
        await d.get_by_placeholder("60").fill("50")
        await d.get_by_role("combobox").first.click()
        await page.wait_for_timeout(400)
        await page.get_by_role("option", name="New category").click()
        await page.wait_for_timeout(300)
        await d.get_by_placeholder("Category name").fill(NAME)
        await page.screenshot(path=str(S/"3_filled.png"))
        await d.get_by_role("button", name="Add item").click()
        await page.wait_for_timeout(3000)
        await page.screenshot(path=str(S/"4_saved.png"))
        # dropdown updated without reopening? reopen dialog and check option exists
        await page.get_by_role("button", name="Add item").first.click()
        await page.wait_for_timeout(800)
        d = page.locator("[role=dialog]")
        await d.get_by_role("combobox").first.click()
        await page.wait_for_timeout(500)
        opts = await page.get_by_role("option").all_inner_texts()
        print("dropdown options:", opts)
        print("category in dropdown:", NAME in opts)
        await page.keyboard.press("Escape")
        await page.keyboard.press("Escape")
        # public API
        slug = await page.evaluate("() => location.pathname")
        sf = json.load(urllib.request.urlopen(urllib.request.Request("http://localhost:8080/api/public/storefronts", headers={"x-api-key": API_KEY})))
        print("storefronts:", [s2.get("slug") for s2 in (sf.get("storefronts") or sf)])
        for s2 in (sf.get("storefronts") or sf):
            m = public_menu(s2["slug"])
            names = [c["name"] for c in m["categories"]]
            if NAME in names:
                print("PUBLIC API OK:", s2["slug"], names)
                break
        else:
            print("PUBLIC API MISSING:", NAME)
        await b.close()

asyncio.run(main())

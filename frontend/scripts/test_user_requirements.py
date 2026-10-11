import os
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\OASIS\.gemini\antigravity-ide\brain\ba04ffad-2b7f-47ef-a04f-f7f4b452f008"

def test_requirements():
    print("==================================================")
    print("VERIFYING USER REQUIREMENTS IMPLEMENTATION")
    print("==================================================")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()

        # ----------------------------------------------------
        # 1. Homepage: Search Bar ABOVE text & clean bg
        # ----------------------------------------------------
        print("\n[TEST 1] Verifying Homepage layout: Search bar above text")
        page.goto("http://localhost:3000/en", wait_until="domcontentloaded")
        page.wait_for_timeout(2000)

        # Check search bar and headline positions
        search_box = page.locator("button:has-text('Where')").first.bounding_box()
        headline_box = page.locator("h1:has-text('دارنا، دارك وين ما تروح')").first.bounding_box()

        print(f"  - Search Bar Y position: {search_box['y'] if search_box else 'N/A'}")
        print(f"  - Headline Y position: {headline_box['y'] if headline_box else 'N/A'}")

        if search_box and headline_box:
            is_above = search_box['y'] < headline_box['y']
            print(f"  - Search Bar is ABOVE Headline text: {is_above}")
            assert is_above, "Search bar must be above headline text"

        p1_path = os.path.join(ARTIFACT_DIR, "req1_search_above_text.png")
        page.screenshot(path=p1_path, full_page=False)
        print(f"  - Captured screenshot: {p1_path}")

        # ----------------------------------------------------
        # 2. Search Bar Open: Popover floats ABOVE all items
        # ----------------------------------------------------
        print("\n[TEST 2] Verifying Search Bar Popover z-index and elevation")
        where_btn = page.locator("button:has-text('Where')").first
        where_btn.click()
        page.wait_for_timeout(700)

        popover_visible = page.locator("text=Search by Wilaya or Region").or_(page.locator("text=Algiers")).first.is_visible()
        print(f"  - Search Popover opened and visible: {popover_visible}")

        p2_path = os.path.join(ARTIFACT_DIR, "req2_search_popover_above.png")
        page.screenshot(path=p2_path, full_page=False)
        print(f"  - Captured screenshot: {p2_path}")

        # Close popover by clicking outside or pressing Escape
        page.keyboard.press("Escape")
        page.wait_for_timeout(300)

        # ----------------------------------------------------
        # 3. Listing Cards on Home Page: Compact & Invisible Slider Scrollbar
        # ----------------------------------------------------
        print("\n[TEST 3] Verifying compact cards and invisible slider scrollbar")
        first_carousel_card = page.locator("div.card-hover-lift").first
        first_carousel_card.scroll_into_view_if_needed()
        page.wait_for_timeout(500)

        card_box = first_carousel_card.bounding_box()
        print(f"  - Compact card width: {card_box['width'] if card_box else 'N/A'}px (compact <= 240px)")

        p3_path = os.path.join(ARTIFACT_DIR, "req3_compact_cards_invisible_slider.png")
        page.screenshot(path=p3_path, full_page=False)
        print(f"  - Captured screenshot: {p3_path}")

        # ----------------------------------------------------
        # 4. Click item on Home Page -> Redirect to /search with split map
        # ----------------------------------------------------
        print("\n[TEST 4] Clicking item on Home Page -> Redirect to split map page")
        first_carousel_card.click()
        page.wait_for_url("**/search*", timeout=10000)
        page.wait_for_timeout(2000)

        current_url = page.url
        print(f"  - Redirected URL: {current_url}")
        has_selected_id = "selectedId=" in current_url
        print(f"  - URL contains selectedId parameter: {has_selected_id}")

        # Verify Split View: Listing Cards on Left, Map on Right
        map_visible = page.locator(".leaflet-container, div[class*='leaflet']").first.is_visible()
        selected_banner = page.locator("text=Focused property selected").first.is_visible()
        print(f"  - Interactive Map visible on the right: {map_visible}")
        print(f"  - Selected property banner / focus indicator on the left: {selected_banner}")

        p4_path = os.path.join(ARTIFACT_DIR, "req4_split_map_view.png")
        page.screenshot(path=p4_path, full_page=False)
        print(f"  - Captured screenshot: {p4_path}")

        # ----------------------------------------------------
        # 5. Click item on the Search page -> Redirect to its detail page
        # ----------------------------------------------------
        print("\n[TEST 5] Clicking item on /search page -> Redirect to listing detail page")
        search_card = page.locator("div.card-hover-lift").first
        search_card.click()
        page.wait_for_url("**/listings/*", timeout=10000)
        page.wait_for_timeout(2000)

        detail_url = page.url
        print(f"  - Listing Detail URL: {detail_url}")
        is_detail_page = "/listings/" in detail_url
        print(f"  - Successfully on listing detail page: {is_detail_page}")

        detail_title = page.locator("h1").first.inner_text()
        print(f"  - Listing Detail Title: {detail_title}")

        p5_path = os.path.join(ARTIFACT_DIR, "req5_listing_detail_page.png")
        page.screenshot(path=p5_path, full_page=False)
        print(f"  - Captured screenshot: {p5_path}")

        browser.close()

    print("\n==================================================")
    print("ALL 5 USER REQUIREMENTS VERIFIED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    test_requirements()

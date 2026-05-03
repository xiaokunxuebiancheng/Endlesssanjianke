# Blog Pages Design

## Overview
Add blog functionality using the existing `posts` table. Three pages: article list, article detail, admin editor.

## Routes

| Route | Page | Description |
|---|---|---|
| `/blog` | BlogList | Card grid with cover, title, excerpt, date, tags, view count |
| `/blog/:slug` | BlogPost | Full article content, tags, view count increment |
| `/admin/write` | AdminWrite | Markdown editor for creating/editing posts |

## Data Source
Existing `posts` table: id, title, slug, excerpt, content, cover_url, tags, category, is_published, is_pinned, view_count, created_at. Existing `increment_view` RPC.

## Features

### Blog List (`/blog`)
- Card grid layout (2-3 columns responsive)
- Each card: cover image (or placeholder), title, excerpt (2-line clamp), tags (clickable for filtering via `?tag=`), publish date, view count
- Tag filter bar at top (extracted from all posts)
- Only published posts shown publicly; admin sees all

### Blog Post (`/blog/:slug`)
- Full article with title, date, tags, view count
- Increment view_count on page load via `increment_view` RPC
- Back link to blog list
- Admin: edit button linking to `/admin/write?slug=xxx`

### Admin Editor (`/admin/write`)
- Admin-only route
- Fields: title, slug (auto-generated from title), excerpt, content (textarea), tags (comma-separated), cover_url, is_published toggle
- Create new or edit existing (via `?slug=` query param)
- Save as draft or publish

### Navigation
- Add "博客" link to BlogLayout nav bar (between 关于 and 画廊)
- Admin nav dropdown: add "写文章" entry

## Styling
- Follow existing patterns: liquid-glass cards, white text on dark bg, Tailwind v4
- Same card style as existing components

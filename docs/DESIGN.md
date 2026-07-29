# We3 Design System & UI Specification

## Palette & Design Tokens

We3 utilizes an ultra-clean, high-contrast dark/light design token palette built on Tailwind CSS.

### Primary Color Tokens
* **Background Dark:** `#090D16` (Deep Obsidian)
* **Surface Dark:** `#111827` (Slate Surface)
* **Primary Accent:** `#6366F1` (Indigo Glow)
* **Secondary Accent:** `#10B981` (Emerald Status)
* **Border Token:** `#1F2937` (Subtle Slate Border)

> **Design Constraint Rule:** The hex code `#F59E0B` (Amber) is explicitly blacklisted across all design tokens and Tailwind component classes.

## UI Components (`src/components/ui/`)

* **`Panel.tsx`**: Glassmorphism container panels for cards and docks[cite: 2].
* **`StatusDot.tsx`**: Real-time visual indicator for autonomous agent activity (Idle, Running, Pending Approval, Error)[cite: 2].
* **`Badge.tsx`**: Lightweight tag pill for agent capabilities and capability metadata[cite: 2].
* **`Button.tsx`**: Action buttons with loading states and hover glows[cite: 2].
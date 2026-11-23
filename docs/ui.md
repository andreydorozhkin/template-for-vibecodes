# UI: Radix Themes

Интерфейс в `app/` собирают из **Radix Themes** (`@radix-ui/themes`). Это конструктор экранов для агента и человека: не рисовать дизайн с нуля и не подключать второй UI-стек.

## Правила

- Компоненты брать из `@radix-ui/themes`: `Button`, `TextField`, `TextArea`, `Card`, `Flex`, `Grid`, `Box`, `Container`, `Heading`, `Text`, `Link`, `Table`, `Dialog`, `Select`, `Tabs`, `Callout` и остальные из документации Themes.
- Корневой `<Theme>` уже в `app/app/layout.tsx` (`appearance="light"`, `accentColor="teal"`, `grayColor="sand"`, `radius="medium"`). Новую тему или другую UI-библиотеку не добавляют без явной просьбы человека.
- Не добавлять Tailwind, shadcn/ui, MUI, Mantine и аналоги. Не дублировать Radix Themes своим CSS для кнопок/полей/карточек.
- Кастомный CSS в `globals.css` — только сброс/минимальная оболочка. Любой заметный кастом в PR с кратким обоснованием.
- Клиентские интерактивы (Dialog и т.п.) — в `"use client"` компонентах; страницы по возможности Server Components.
- Пример экранов: `app/app/login/page.tsx`, `app/app/notes/page.tsx`, `app/components/note-form.tsx`.

## Документация

- https://www.radix-ui.com/themes/docs/overview/getting-started
- https://www.radix-ui.com/themes/docs/components/button

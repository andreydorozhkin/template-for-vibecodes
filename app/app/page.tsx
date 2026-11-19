import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <h1>Заметки</h1>
      <p className="lede">Пример сервиса: вход через Supabase Auth и запись через Edge Function.</p>
      <div className="row">
        <Link className="button" href="/login">
          Войти
        </Link>
        <Link href="/notes">К заметкам</Link>
      </div>
    </main>
  );
}

import { signIn, signUp } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const message =
    params.error === "invalid"
      ? "Неверная почта или пароль."
      : params.error === "signup"
        ? "Не удалось создать учётную запись."
        : null;

  return (
    <main>
      <h1>Вход</h1>
      <p className="lede">Почта и пароль проверяет Supabase Auth. Своей авторизации в приложении нет.</p>
      {message ? (
        <p className="error" role="alert">
          {message}
        </p>
      ) : null}
      <form action={signIn}>
        <label htmlFor="email">Почта</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
        <label htmlFor="password">Пароль</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required minLength={6} />
        <div className="row">
          <button type="submit">Войти</button>
          <button type="submit" formAction={signUp}>
            Создать учётную запись
          </button>
        </div>
      </form>
    </main>
  );
}

import { Button, Callout, Container, Flex, Heading, Text, TextField } from "@radix-ui/themes";
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
    <Container size="2" py="9" px="4">
      <Flex direction="column" gap="4">
        <Heading size="8">Вход</Heading>
        <Text color="gray" size="3">
          Почта и пароль проверяет Supabase Auth. Своей авторизации в приложении нет.
        </Text>
        {message ? (
          <Callout.Root color="red" role="alert">
            <Callout.Text>{message}</Callout.Text>
          </Callout.Root>
        ) : null}
        <Flex direction="column" gap="3" asChild>
          <form action={signIn}>
            <Flex direction="column" gap="2">
              <Text as="label" size="2" weight="medium" htmlFor="email">
                Почта
              </Text>
              <TextField.Root id="email" name="email" type="email" autoComplete="email" required />
            </Flex>
            <Flex direction="column" gap="2">
              <Text as="label" size="2" weight="medium" htmlFor="password">
                Пароль
              </Text>
              <TextField.Root
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                minLength={6}
              />
            </Flex>
            <Flex gap="3" mt="2">
              <Button type="submit">Войти</Button>
              <Button type="submit" variant="soft" formAction={signUp}>
                Создать учётную запись
              </Button>
            </Flex>
          </form>
        </Flex>
      </Flex>
    </Container>
  );
}

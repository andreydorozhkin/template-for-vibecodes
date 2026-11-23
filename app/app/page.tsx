import Link from "next/link";
import { Button, Container, Flex, Heading, Text } from "@radix-ui/themes";

export default function HomePage() {
  return (
    <Container size="2" py="9" px="4">
      <Flex direction="column" gap="4">
        <Heading size="8">Заметки</Heading>
        <Text color="gray" size="3">
          Пример сервиса: вход через Supabase Auth и запись через Edge Function.
        </Text>
        <Flex gap="3" align="center">
          <Button asChild>
            <Link href="/login">Войти</Link>
          </Button>
          <Button asChild variant="soft">
            <Link href="/notes">К заметкам</Link>
          </Button>
        </Flex>
      </Flex>
    </Container>
  );
}

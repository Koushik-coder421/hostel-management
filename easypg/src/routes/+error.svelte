<script lang="ts">
  import { page } from '$app/state';
  import { Button, Heading, Text, VStack } from '@astryx-svelte/core';
</script>

<svelte:head><title>{page.status} — EasyPG</title></svelte:head>
<VStack as="main" padding={6} gap={4} hAlign="start">
  <Text type="supporting">Error {page.status}</Text>
  <Heading level={1}>This page could not be loaded</Heading>
  <Text>{page.error?.message ?? 'An unexpected error occurred. Please try again.'}</Text>
  <Button label="Retry" size="lg" variant="primary" onclick={() => window.location.reload()} />
  <Button label="Back to sign in" size="lg" variant="secondary" href="/login" />
</VStack>

'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useTenantSelection } from './tenant-store';

const schema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'Must be at least 3 characters')
    .max(63, 'Must be at most 63 characters')
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      'Lowercase letters, numbers, and single hyphens only',
    ),
});

type FormValues = z.infer<typeof schema>;

/**
 * This is tenant selection, not user login — there is no real authentication yet
 * (Phase 10 adds Keycloak). Submitting takes you to the portal for the institution
 * whose slug you entered, exactly like typing <slug>.udos.app would once real
 * subdomain routing exists (Architecture §5). The portal page is what proves the
 * slug is real, by actually fetching that tenant from the backend.
 */
export function TenantSelectForm() {
  const router = useRouter();
  const setTenantSlug = useTenantSelection((state) => state.setTenantSlug);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(({ slug }) => {
    setTenantSlug(slug);
    router.push('/portal');
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="slug">Institution identifier</Label>
        <Input
          id="slug"
          placeholder="e.g. acme-college"
          autoComplete="off"
          autoFocus
          {...register('slug')}
        />
        {errors.slug && <p className="text-sm text-destructive">{errors.slug.message}</p>}
      </div>
      <Button type="submit" disabled={isSubmitting}>
        Continue
      </Button>
    </form>
  );
}

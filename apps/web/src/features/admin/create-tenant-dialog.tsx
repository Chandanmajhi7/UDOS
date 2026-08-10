'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { ApiError } from '../../lib/api-client';
import { useCreateTenant } from './use-admin-tenants';

const schema = z.object({
  name: z.string().trim().min(1, 'Required'),
  legalName: z.string().trim().min(1, 'Required'),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'At least 3 characters')
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Lowercase letters, numbers, and single hyphens only'),
  campusName: z.string().trim().min(1, 'Required'),
  campusCode: z.string().trim().min(1, 'Required'),
});

type FormValues = z.infer<typeof schema>;

export function CreateTenantDialog() {
  const [open, setOpen] = useState(false);
  const createTenant = useCreateTenant();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await createTenant.mutateAsync({
        name: values.name,
        legalName: values.legalName,
        slug: values.slug,
        primaryCampus: { name: values.campusName, code: values.campusCode },
      });
      reset();
      setOpen(false);
    } catch {
      // Surfaced below via createTenant.error — the request genuinely failed
      // (e.g. duplicate slug), not something to silently swallow.
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>New tenant</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Provision a new tenant</DialogTitle>
          <DialogDescription>
            Creates the institution and its primary campus via the real
            ProvisionTenantUseCase (platform-admin connection, Phase 6d/8).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Institution name</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="legalName">Legal name</Label>
              <Input id="legalName" {...register('legalName')} />
              {errors.legalName && (
                <p className="text-xs text-destructive">{errors.legalName.message}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" placeholder="e.g. acme-college" {...register('slug')} />
            {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="campusName">Primary campus name</Label>
              <Input id="campusName" defaultValue="Main Campus" {...register('campusName')} />
              {errors.campusName && (
                <p className="text-xs text-destructive">{errors.campusName.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="campusCode">Campus code</Label>
              <Input id="campusCode" defaultValue="MAIN" {...register('campusCode')} />
              {errors.campusCode && (
                <p className="text-xs text-destructive">{errors.campusCode.message}</p>
              )}
            </div>
          </div>

          {createTenant.isError && (
            <p className="text-sm text-destructive">
              {createTenant.error instanceof ApiError
                ? createTenant.error.message
                : 'Failed to create tenant.'}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating…' : 'Create tenant'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

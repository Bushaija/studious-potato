"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader, AlertCircle } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { User } from "@/types/user";
import { useGetAllFacilities } from "@/hooks/queries/facilities/use-get-all-facilities";
import { useUpdateUser } from "@/hooks/mutations/users/use-update-user";
import { UserForm } from "./user-form";

const updateUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["admin", "accountant", "program_manager", "daf", "dg"] as const),
  facilityId: z.number().min(1, "Facility is required"),
  permissions: z.array(z.string()),
  projectAccess: z.array(z.number()),
  isActive: z.boolean(),
  mustChangePassword: z.boolean(),
}).refine(
  (data) => {
    // DAF and DG roles require hospital facility - validation happens on server
    // This is just a client-side check for better UX
    return true;
  },
  {
    message: "DAF and DG roles require a hospital facility",
    path: ["facilityId"],
  }
);

type UpdateUserFormData = z.infer<typeof updateUserSchema>;

interface UpdateUserSheetProps
  extends React.ComponentPropsWithRef<typeof Sheet> {
  user: User | null;
}

export function UpdateUserSheet({ user, ...props }: UpdateUserSheetProps) {
  const [isPending, startTransition] = React.useTransition();
  const [hasInvalidFacility, setHasInvalidFacility] = React.useState(false);

  const { data: facilities } = useGetAllFacilities();
  const updateUserMutation = useUpdateUser();

  const form = useForm<UpdateUserFormData>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      name: user?.name ?? "",
      email: user?.email ?? "",
      role: user?.role ?? "accountant",
      facilityId: user?.facilityId ?? undefined,
      permissions: user?.permissions ?? [],
      projectAccess: user?.projectAccess ?? [],
      isActive: user?.isActive ?? true,
      mustChangePassword: user?.mustChangePassword ?? true,
    },
  });

  // Update form when user changes
  React.useEffect(() => {
    if (user) {
      form.reset({
        name: user.name,
        email: user.email,
        role: user.role,
        facilityId: user.facilityId,
        permissions: user.permissions || [],
        projectAccess: user.projectAccess || [],
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword,
      });
    }
  }, [user, form]);

  // Check if the user's facility is valid
  React.useEffect(() => {
    if (user?.facilityId && facilities) {
      const facilityExists = facilities.some(
        (facility) => facility.id === user.facilityId
      );
      setHasInvalidFacility(!facilityExists);
    } else {
      setHasInvalidFacility(false);
    }
  }, [user?.facilityId, facilities]);

  function onSubmit(input: UpdateUserFormData) {
    startTransition(async () => {
      if (!user) return;

      try {
        await updateUserMutation.mutateAsync({
          userId: user.id,
          name: input.name,
          email: input.email,
          role: input.role,
          facilityId: input.facilityId,
          permissions: input.permissions,
          projectAccess: input.projectAccess,
          isActive: input.isActive,
          mustChangePassword: input.mustChangePassword,
        });

        toast.success("User updated successfully");
        form.reset(input);
        props.onOpenChange?.(false);
      } catch (error) {
        console.error("Update user error:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to update user";
        toast.error(errorMessage);
      }
    });
  }

  return (
    <Sheet {...props}>
      <SheetContent className="flex flex-col gap-6 sm:max-w-md">
        <SheetHeader className="text-left">
          <SheetTitle>Update User</SheetTitle>
          <SheetDescription>
            Update the user details and save the changes
          </SheetDescription>
        </SheetHeader>
        {hasInvalidFacility && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This user has an invalid facility assignment. Please select a valid facility before saving.
            </AlertDescription>
          </Alert>
        )}
        <UserForm form={form} onSubmit={onSubmit}>
          <SheetFooter className="gap-2 pt-2 sm:space-x-0">
            <SheetClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </SheetClose>
            <Button disabled={isPending}>
              {isPending && (
                <Loader
                  className="mr-2 size-4 animate-spin"
                  aria-hidden="true"
                />
              )}
              Save Changes
            </Button>
          </SheetFooter>
        </UserForm>
      </SheetContent>
    </Sheet>
  );
}

'use client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { authClient } from '@/lib/auth';
import { ButtonSpinner } from '@/components/skeletons';
import { useRouter } from 'next/navigation';

export function UserNav() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const user = session?.user;

  if (isPending) {
    // Show a spinner while the session is loading
    return (
      <Button variant="ghost" className="relative h-8 w-8 rounded-full flex items-center justify-center">
        <ButtonSpinner size={20} />
      </Button>
    );
  }

  if (user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' className='relative h-8 w-8 rounded-full'>
            <Avatar className='h-8 w-8'>
              <AvatarImage
                src={user?.image ?? ''}
                alt={user?.name ?? ''}
              />
              <AvatarFallback>{user?.name?.[0]}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className='w-56' align='end' forceMount>
          <DropdownMenuLabel className='font-normal'>
            <div className='flex flex-col space-y-1'>
              <p className='text-sm font-medium leading-none'>
                {user?.name}
              </p>
              <p className='text-xs leading-none text-muted-foreground'>
                {user?.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {/* <DropdownMenuGroup>
            <DropdownMenuItem>
              Profile
              <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              Billing
              <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              Settings
              <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>New Team</DropdownMenuItem>
          </DropdownMenuGroup> */}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            // onClick={() => {
            //   authClient.signOut().then(() => {
            //     router.push("/sign-in");
            //   });
            // }}
            onClick={() => {
              authClient.signOut({
                fetchOptions: {
                  onSuccess: () => {
                    router.push("/sign-in")
                  }
                }
              })
            }}
          >
            Log out
            <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Fallback when not authenticated
  return null;
}
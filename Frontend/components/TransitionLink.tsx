'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MouseEvent, useContext } from 'react';
import { NavigationContext } from './navigation-context';

type TransitionLinkProps = React.ComponentProps<typeof Link>;

export function TransitionLink({ onClick, ...props }: TransitionLinkProps) {
  const router = useRouter();
  const navigation = useContext(NavigationContext);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented || typeof props.href !== 'string' || props.href === window.location.pathname) return;

    event.preventDefault();
    if (navigation) {
      navigation.startTransition(String(props.href), router);
    } else {
      router.push(String(props.href));
    }
  }

  const className = typeof props.className === 'string'
    ? `touch-target ${props.className}`
    : props.className;

  return <Link {...props} className={className} onClick={handleClick} />;
}

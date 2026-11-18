import Image from 'next/image'
import Link from 'next/link'

/** Logo Pit Stop (lambang bulat + tulisan). Dipakai di navbar, footer, dan e-tiket. */
export function BrandLogo({ href }: { href?: string }) {
  const content = (
    <>
      <Image src="/images/brand/logo-mark.png" alt="" width={40} height={40} className="size-10 rounded-full" />
      <span className="flex flex-col">
        <span className="font-display text-xl leading-[1.05] tracking-[1px] text-foreground">PIT STOP</span>
        <span className="text-[9px] font-medium tracking-[2.2px] text-muted-foreground">MEN &amp; KIDS</span>
      </span>
    </>
  )

  if (!href) return <div className="flex items-center gap-2.5">{content}</div>

  return (
    <Link href={href} aria-label="Pit Stop Barbershop — ke beranda" className="flex items-center gap-2.5">
      {content}
    </Link>
  )
}

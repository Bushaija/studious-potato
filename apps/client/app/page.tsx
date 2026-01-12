import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function CallToAction() {
    return (
        <section className="py-16 md:py-32">
            <div className="mx-auto max-w-5xl px-6">
                <div className="text-center">
                    <h2 className="text-balance text-2xl font-semibold lg:text-3xl">Automated Financial Reporting, Powered by AFRS</h2>
                    <p className="mt-4">
                        AFRS is an automated financial reporting system designed to generate accurate, timely, and standardized financial reports across Global Fund programs.
                    </p>

                    <div className="mt-12 flex flex-wrap justify-center gap-4">
                        <Button
                            asChild
                            size="lg">
                            <Link href="/sign-in">
                                <span>Get Started</span>
                            </Link>
                        </Button>

                        <Button
                            asChild
                            size="lg"
                            variant="outline">
                            <Link href="#">
                                <span>Book Demo</span>
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    )
}
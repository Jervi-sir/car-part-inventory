import HomePageController from '@/actions/App/Http/Controllers/HomePageController';
import AppLogoIcon from '@/components/app-logo-icon';
import { Link } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';

interface AuthLayoutProps {
    name?: string;
    title?: string;
    description?: string;
}

export default function AuthSimpleLayout({ children, title, description }: PropsWithChildren<AuthLayoutProps>) {
    return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
            <div className="w-full max-w-sm">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col items-center gap-2">
                        <Link href={HomePageController.home().url} className="flex flex-col items-center gap-2 font-medium">
                            <div className="flex h-24 w-24 items-center justify-center rounded-md">
                                <img src='/images/logo-rafiki-motors-1.png' />
                            </div>
                            <span className="sr-only">{title}</span>
                        </Link>

                        <div className="space-y-1 text-center">
                            <h1 className="text-xl font-medium">{title}</h1>
                            {/* <p className="text-center text-sm text-muted-foreground">{description}</p> */}
                        </div>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}

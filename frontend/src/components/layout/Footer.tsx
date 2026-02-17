import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="border-t border-[#1D222B] bg-[#0F1115]">
            <div className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Brand */}
                    <div className="col-span-1">
                        <div className="flex items-center space-x-2 mb-4">
                            <div className="w-8 h-8 bg-gradient-to-br from-accent to-accent-hover rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-xl">C</span>
                            </div>
                            <span className="text-xl font-bold text-white">ClipKing</span>
                        </div>
                        <p className="text-sm text-gray-400">
                            Create AI-powered videos in minutes with cutting-edge technology.
                        </p>
                    </div>

                    {/* Product */}
                    <div>
                        <h3 className="text-sm font-semibold text-white mb-4">Product</h3>
                        <ul className="space-y-2">
                            <li>
                                <Link href="/#features" className="text-sm text-gray-400 hover:text-accent transition-colors">
                                    Features
                                </Link>
                            </li>
                            <li>
                                <Link href="/#pricing" className="text-sm text-gray-400 hover:text-accent transition-colors">
                                    Pricing
                                </Link>
                            </li>
                            <li>
                                <Link href="/create" className="text-sm text-gray-400 hover:text-accent transition-colors">
                                    Create Video
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Resources */}
                    <div>
                        <h3 className="text-sm font-semibold text-white mb-4">Resources</h3>
                        <ul className="space-y-2">
                            <li>
                                <a href="#" className="text-sm text-gray-400 hover:text-accent transition-colors">
                                    Documentation
                                </a>
                            </li>
                            <li>
                                <a href="#" className="text-sm text-gray-400 hover:text-accent transition-colors">
                                    API Reference
                                </a>
                            </li>
                            <li>
                                <a href="#" className="text-sm text-gray-400 hover:text-accent transition-colors">
                                    Support
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h3 className="text-sm font-semibold text-white mb-4">Legal</h3>
                        <ul className="space-y-2">
                            <li>
                                <a href="#" className="text-sm text-gray-400 hover:text-accent transition-colors">
                                    Privacy Policy
                                </a>
                            </li>
                            <li>
                                <a href="#" className="text-sm text-gray-400 hover:text-accent transition-colors">
                                    Terms of Service
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom */}
                <div className="mt-12 pt-8 border-t border-[#1D222B]">
                    <p className="text-center text-sm text-gray-400">
                        © {new Date().getFullYear()} ClipKing. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}

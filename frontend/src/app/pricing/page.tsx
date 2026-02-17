'use client';

import Link from 'next/link';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

export default function PricingPage() {
    const plans = [
        {
            name: 'Free',
            price: 0,
            credits: 10,
            features: ['Basic quality', 'Moving Images', 'Standard voices', 'Standard queue'],
        },
        {
            name: 'Pro',
            price: 49,
            credits: 200,
            popular: true,
            features: ['Premium quality (Kling)', 'Cinematic AI Video', 'All voices & music', 'Priority rendering', 'No watermark'],
        },
        {
            name: 'Premium',
            price: 99,
            credits: 500,
            features: ['Ultra quality (Sora)', 'Longer duration (60s)', 'Premium voices', 'Fastest rendering', 'API access'],
        },
    ];

    return (
        <div className="min-h-screen bg-[#0F1115] py-20">
            <div className="container mx-auto px-4 text-center">
                <h1 className="text-4xl font-bold text-white mb-4">Choose Your Plan</h1>
                <p className="text-gray-400 mb-12">Flexible pricing for creators of all sizes</p>

                <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                    {plans.map((plan) => (
                        <Card
                            key={plan.name}
                            className={`text-left relative ${plan.popular ? 'border-accent shadow-accent/20 shadow-lg scale-105 z-10' : ''}`}
                        >
                            {plan.popular && (
                                <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2">
                                    <span className="px-3 py-1 bg-accent text-white text-xs font-bold rounded-full">POPULAR</span>
                                </div>
                            )}
                            <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                            <div className="mb-6">
                                <span className="text-4xl font-bold text-white">${plan.price}</span>
                                <span className="text-gray-400">/month</span>
                            </div>
                            <p className="text-accent font-medium mb-6">
                                {plan.credits} Credits / month
                            </p>

                            <ul className="space-y-3 mb-8">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex items-center text-sm text-gray-300">
                                        <svg className="w-4 h-4 text-accent mr-2" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <Button variant={plan.popular ? 'primary' : 'outline'} className="w-full">
                                {plan.price === 0 ? 'Current Plan' : 'Upgrade'}
                            </Button>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}

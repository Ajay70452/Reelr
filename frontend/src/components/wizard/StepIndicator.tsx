import { cn } from '@/lib/utils';

interface StepIndicatorProps {
    currentStep: number;
    totalSteps: number;
    steps: string[];
}

export default function StepIndicator({ currentStep, totalSteps, steps }: StepIndicatorProps) {
    return (
        <div className="w-full mb-8">
            {/* Progress bar */}
            <div className="relative">
                <div className="absolute top-5 left-0 right-0 h-0.5 bg-[#1D222B]" />
                <div
                    className="absolute top-5 left-0 h-0.5 bg-accent transition-all duration-500"
                    style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
                />

                {/* Steps */}
                <div className="relative flex justify-between">
                    {steps.map((step, index) => {
                        const stepNumber = index + 1;
                        const isCompleted = stepNumber < currentStep;
                        const isCurrent = stepNumber === currentStep;

                        return (
                            <div key={stepNumber} className="flex flex-col items-center">
                                <div
                                    className={cn(
                                        'w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300',
                                        isCompleted && 'bg-accent text-white',
                                        isCurrent && 'bg-accent text-white shadow-[0_0_20px_rgba(124,92,255,0.5)]',
                                        !isCompleted && !isCurrent && 'bg-[#1D222B] text-gray-400'
                                    )}
                                >
                                    {isCompleted ? (
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    ) : (
                                        stepNumber
                                    )}
                                </div>
                                <span
                                    className={cn(
                                        'mt-2 text-xs font-medium transition-colors',
                                        isCurrent ? 'text-accent' : 'text-gray-400'
                                    )}
                                >
                                    {step}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

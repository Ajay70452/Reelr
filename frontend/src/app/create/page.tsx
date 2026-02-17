'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/userStore';
import { useWizardStore } from '@/store/wizardStore';
import { useGenres, useVisualStyles, usePresets, useVoices, useMusic } from '@/hooks/useApi';
import Button from '@/components/ui/Button';
import StepIndicator from '@/components/wizard/StepIndicator';
import GenreCard from '@/components/wizard/GenreCard';
import PresetCard from '@/components/wizard/PresetCard';
import TypeVoiceCard from '@/components/wizard/VoiceCard';
import Select from '@/components/ui/Select';
import Toggle from '@/components/ui/Toggle';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';

export default function CreateVideoPage() {
    const router = useRouter();
    const { user } = useUserStore();

    // Store State (IDs) & Actions
    const {
        currentStep,
        setCurrentStep,
        genreId,
        setGenre,
        customTopic,
        setCustomTopic,
        visualStyleId,
        setVisualStyle,
        presetId,
        setPreset,
        qualityOptionId,
        setQuality,
        voiceId,
        setVoice,
        musicId,
        setMusic,
        aspectRatio,
        duration,
        emphasisWords,
        fastCuts,
        autoEffects,
        autoCaptions,
        updateSettings,
        estimatedCredits
    } = useWizardStore();

    // API Data
    const { data: genres } = useGenres();
    const { data: visualStyles } = useVisualStyles();
    const { data: presets } = usePresets(visualStyleId);
    const { data: voices } = useVoices();
    const { data: musicTracks } = useMusic();

    const [isGenerating, setIsGenerating] = useState(false);

    // Derived Objects (finding object by ID)
    const genre = genres?.find(g => g.id === genreId);
    const visualStyle = visualStyles?.find(s => s.id === visualStyleId);
    const preset = presets?.find(p => p.id === presetId);
    const voice = voices?.find(v => v.id === voiceId);
    const music = musicTracks?.find(m => m.id === musicId);

    // Redirect if not logged in
    useEffect(() => {
        if (!user) {
            router.push('/auth/login');
        }
    }, [user, router]);

    const handleNext = () => {
        if (currentStep < 4) {
            setCurrentStep(currentStep + 1);
            window.scrollTo(0, 0);
        } else {
            handleGenerate();
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
            window.scrollTo(0, 0);
        }
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        // Simulate API call
        try {
            await new Promise(resolve => setTimeout(resolve, 2000));
            const mockJobId = `job_${Date.now()}`;
            router.push(`/status/${mockJobId}`);
        } catch (error) {
            console.error('Generation failed', error);
            setIsGenerating(false);
        }
    };

    const steps = ['Genre & Topic', 'Visual Style', 'Audio', 'Settings'];

    // Render Step 1: Genre & Topic
    const renderStep1 = () => {
        const isCustom = genreId === 'custom';

        return (
            <div className="space-y-8 animate-fade-in">
                <div className="text-center mb-8">
                    <h2 className="text-xl md:text-2xl xl:text-3xl font-bold text-white mb-2">What kind of video?</h2>
                    <p className="text-gray-400">Choose a genre to get started</p>
                </div>

                {/* Genre Dropdown */}
                <div className="max-w-xl mx-auto">
                    <Select
                        label="Video Category"
                        options={[
                            { value: '0', label: 'Select a category...' },
                            ...(genres?.map(g => ({
                                value: g.id,
                                label: `${g.display_name} - ${g.description}`
                            })) || []),
                            { value: 'custom', label: 'Custom - Create your own topic' }
                        ]}
                        value={genreId || '0'}
                        onChange={(e) => {
                            const value = e.target.value;
                            if (value === 'custom') {
                                setGenre('custom');
                                setCustomTopic('');
                            } else if (value !== '0') {
                                setGenre(value);
                                setCustomTopic(null);
                            } else {
                                setGenre(null);
                                setCustomTopic(null);
                            }
                        }}
                    />
                </div>

                {/* Show custom input only when Custom is selected */}
                {isCustom && (
                    <div className="max-w-xl mx-auto animate-fade-in">
                        <Input
                            label="Custom Topic"
                            placeholder="E.g., The history of coffee in 30 seconds..."
                            value={customTopic || ''}
                            onChange={(e) => setCustomTopic(e.target.value)}
                            helperText="Describe what you want your video to be about"
                        />
                    </div>
                )}

                {/* Show optional topic field for selected genres */}
                {genreId && genreId !== 'custom' && (
                    <div className="max-w-xl mx-auto animate-fade-in">
                        <Input
                            label="Specific Topic (Optional)"
                            placeholder="E.g., The history of coffee in 30 seconds..."
                            value={customTopic || ''}
                            onChange={(e) => setCustomTopic(e.target.value)}
                            helperText="Leave empty to let AI choose a trending topic within your genre"
                        />
                    </div>
                )}
            </div>
        );
    };

    // Render Step 2: Visual Style
    const renderStep2 = () => (
        <div className="space-y-8 animate-fade-in">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">How should it look?</h2>
                <p className="text-gray-400">Select a visual style and preset</p>
            </div>

            {/* Main Style Selector */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-6 md:mb-8">
                {visualStyles?.map((style) => (
                    <button
                        key={style.id}
                        onClick={() => setVisualStyle(style.id)}
                        className={`p-6 rounded-xl border-2 text-left transition-all ${visualStyleId === style.id
                            ? 'border-accent bg-accent/10'
                            : 'border-gray-800 bg-gray-900 hover:border-gray-700'
                            }`}
                    >
                        <h3 className={`text-xl font-bold mb-2 ${visualStyleId === style.id ? 'text-accent' : 'text-white'}`}>
                            {style.display_name}
                        </h3>
                        <p className="text-gray-400 text-sm mb-4">{style.description}</p>
                        <div className={`px-3 py-1 inline-block rounded-full text-xs font-semibold ${
                            style.type === 'cinematic'
                                ? 'bg-purple-500/20 text-purple-400'
                                : style.type === 'stock'
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-blue-500/20 text-blue-400'
                            }`}>
                            {style.type === 'cinematic' ? 'Top Quality' : style.type === 'stock' ? 'Instant' : 'Fast Render'}
                        </div>
                    </button>
                ))}
            </div>

            {/* Presets Grid */}
            {visualStyleId && (
                <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-white">Select a Preset</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {presets?.map((p) => (
                            <PresetCard
                                key={p.id}
                                preset={p}
                                isSelected={presetId === p.id}
                                onClick={() => setPreset(p.id)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Quality Options */}
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                <h3 className="text-lg font-semibold text-white mb-4">Quality Tier</h3>
                <div className="flex flex-col md:flex-row gap-4">
                    {[
                        { id: 'standard', name: 'Standard', credits: 2 },
                        { id: 'premium', name: 'Premium', credits: 5 },
                        { id: 'ultra_premium', name: 'Ultra Premium', credits: 12 }
                    ].map((q) => (
                        <button
                            key={q.id}
                            onClick={() => setQuality(q.id)}
                            className={`flex-1 py-3 px-4 rounded-lg border transition-all ${qualityOptionId === q.id
                                ? 'border-accent bg-accent/10 text-accent'
                                : 'border-gray-700 bg-gray-800 text-gray-400 hover:bg-gray-700'
                                }`}
                        >
                            <div className="font-bold">{q.name}</div>
                            <div className="text-xs opacity-70">{q.credits} Credits</div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    // Render Step 3: Audio
    const renderStep3 = () => (
        <div className="space-y-8 animate-fade-in">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">How should it sound?</h2>
                <p className="text-gray-400">Choose a voice and background music</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Voice Selection */}
                <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-white">AI Voice</h3>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {voices?.map((v) => (
                            <TypeVoiceCard
                                key={v.id}
                                voice={v}
                                isSelected={voiceId === v.id}
                                onClick={() => setVoice(v.id)}
                            />
                        ))}
                    </div>
                </div>

                {/* Music Selection */}
                <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-white">Background Music</h3>
                    <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                        <Select
                            label="Select Mood / Genre"
                            options={[
                                { value: '0', label: 'Select music...' },
                                ...(musicTracks?.map(m => ({
                                    value: m.id,
                                    label: `${m.display_name} (${m.mood})`
                                })) || [])
                            ]}
                            value={musicId || '0'}
                            onChange={(e) => {
                                const value = e.target.value;
                                if (value && value !== '0') setMusic(value);
                                else setMusic(null);
                            }}
                        />

                        {music && (
                            <div className="mt-4 p-4 bg-black/50 rounded-lg border border-gray-800">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <div className="text-white font-medium">{music.display_name}</div>
                                        <div className="text-xs text-gray-400">{music.genre} • {music.duration}s</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    // Render Step 4: Settings
    const renderStep4 = () => (
        <div className="space-y-8 animate-fade-in">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">Final Touches</h2>
                <p className="text-gray-400">Configure format and advanced settings</p>
            </div>

            <div className="max-w-2xl mx-auto space-y-6">
                <Card>
                    <h3 className="text-lg font-semibold text-white mb-4">Video Format</h3>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-3">Aspect Ratio</label>
                            <div className="flex gap-4">
                                {['9:16', '16:9', '1:1'].map((ratio) => (
                                    <button
                                        key={ratio}
                                        onClick={() => updateSettings({ aspectRatio: ratio })}
                                        className={`flex-1 py-3 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all ${aspectRatio === ratio
                                            ? 'border-accent bg-accent/10 text-accent'
                                            : 'border-gray-800 bg-gray-900 text-gray-400 hover:border-gray-600'
                                            }`}
                                    >
                                        <div className={`border-2 border-current rounded-sm ${ratio === '9:16' ? 'w-4 h-6' : ratio === '16:9' ? 'w-6 h-4' : 'w-5 h-5'
                                            }`} />
                                        <span className="text-sm font-medium">{ratio}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-3">Duration</label>
                            <div className="flex gap-4">
                                {[15, 30, 45, 60].map((sec) => (
                                    <button
                                        key={sec}
                                        onClick={() => updateSettings({ duration: sec })}
                                        className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${duration === sec
                                            ? 'border-accent bg-accent/10 text-accent'
                                            : 'border-gray-800 bg-gray-900 text-gray-400 hover:border-gray-600'
                                            }`}
                                    >
                                        {sec}s
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </Card>

                <Card>
                    <h3 className="text-lg font-semibold text-white mb-4">Advanced Options</h3>
                    <div className="space-y-4">
                        <Toggle
                            label="Auto Captions"
                            enabled={autoCaptions}
                            onChange={(val) => updateSettings({ autoCaptions: val })}
                        />
                        <Toggle
                            label="Fast Cuts Mode"
                            enabled={fastCuts}
                            onChange={(val) => updateSettings({ fastCuts: val })}
                        />
                        <Toggle
                            label="Emphasis Words"
                            enabled={emphasisWords}
                            onChange={(val) => updateSettings({ emphasisWords: val })}
                        />
                        <Toggle
                            label="AI Effects (Auto)"
                            enabled={autoEffects}
                            onChange={(val) => updateSettings({ autoEffects: val })}
                        />
                    </div>
                </Card>

                {/* Cost Summary */}
                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-800 text-center">
                    <span className="text-gray-400 mr-2">Estimated Cost:</span>
                    <span className="text-xl font-bold text-accent">
                        {estimatedCredits} Credits
                    </span>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#0F1115] text-white pb-20 md:pb-0 pt-8">
            <div className="container mx-auto px-4 md:px-6 xl:px-8 max-w-5xl">
                <StepIndicator currentStep={currentStep} totalSteps={4} steps={steps} />

                <div className="mt-8 mb-6 md:mb-8 xl:mb-12">
                    {currentStep === 1 && renderStep1()}
                    {currentStep === 2 && renderStep2()}
                    {currentStep === 3 && renderStep3()}
                    {currentStep === 4 && renderStep4()}
                </div>

                {/* Navigation Footer */}
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#0F1115]/80 backdrop-blur-md border-t border-gray-800 z-50">
                    <div className="container mx-auto max-w-5xl flex justify-between items-center">
                        <Button
                            variant="ghost"
                            onClick={handleBack}
                            disabled={currentStep === 1 || isGenerating}
                        >
                            Back
                        </Button>

                        <div className="text-sm font-medium text-gray-400 hidden sm:block">
                            Step {currentStep} of 4
                        </div>

                        <Button
                            variant={currentStep === 4 ? 'primary' : 'secondary'}
                            onClick={handleNext}
                            disabled={
                                (currentStep === 1 && (!genreId || (genreId === 'custom' && (!customTopic || customTopic.trim().length === 0)))) ||
                                (currentStep === 2 && (!visualStyleId || !presetId || !qualityOptionId)) ||
                                (currentStep === 3 && (!voiceId || !musicId)) ||
                                isGenerating
                            }
                            isLoading={isGenerating && currentStep === 4}
                        >
                            {currentStep === 4 ? (isGenerating ? 'Generating...' : 'Generate Video') : 'Next Step'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

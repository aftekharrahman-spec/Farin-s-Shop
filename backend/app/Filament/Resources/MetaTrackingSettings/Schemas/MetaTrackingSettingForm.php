<?php

namespace App\Filament\Resources\MetaTrackingSettings\Schemas;

use App\Models\MetaTrackingSetting;
use Filament\Forms\Components\Placeholder;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Components\Utilities\Get;
use Filament\Schemas\Schema;

class MetaTrackingSettingForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Placeholder::make('tracking_notice')
                    ->label('Consent and privacy')
                    ->content('The browser Pixel loads only after a visitor accepts optional marketing cookies. Conversion API purchase events use a consent-gated encrypted queue and do not include customer name, phone, email, or delivery address.'),
                Toggle::make('is_enabled')
                    ->label('Enable Meta Pixel')
                    ->default(false),
                TextInput::make('pixel_id')
                    ->label('Meta Pixel ID')
                    ->numeric()
                    ->minLength(5)
                    ->maxLength(30)
                    ->regex('/^\d{5,30}$/')
                    ->required()
                    ->helperText('Pixel ID is public configuration; do not enter an access token here.'),
                TextInput::make('website_url')
                    ->label('Storefront website URL')
                    ->url()
                    ->maxLength(255)
                    ->required(fn (Get $get): bool => (bool) $get('conversions_api_enabled')),
                Toggle::make('conversions_api_enabled')
                    ->label('Enable Conversions API (Purchase)')
                    ->default(false)
                    ->helperText('Requires a valid Pixel ID, website URL, access token, visitor consent, and a running queue worker.'),
                TextInput::make('access_token')
                    ->label('Conversions API access token')
                    ->password()
                    ->revealable()
                    ->maxLength(4096)
                    ->placeholder(fn (?MetaTrackingSetting $record): string => filled($record?->access_token)
                        ? 'Token saved securely — leave blank to keep it'
                        : 'Paste the access token once; it will not be shown again')
                    ->dehydrated(fn (?string $state): bool => filled($state))
                    ->required(fn (Get $get, ?MetaTrackingSetting $record): bool => (bool) $get('conversions_api_enabled') && blank($record?->access_token))
                    ->helperText('Stored using Laravel encrypted casts; never returned by public API or displayed after saving.'),
                Toggle::make('clear_access_token')
                    ->label('Remove the saved access token')
                    ->default(false)
                    ->visible(fn (?MetaTrackingSetting $record): bool => filled($record?->access_token)),
                TextInput::make('test_event_code')
                    ->label('Meta test event code (optional)')
                    ->maxLength(100)
                    ->helperText('Clear this field when you finish Meta Events Manager testing.'),
            ]);
    }
}

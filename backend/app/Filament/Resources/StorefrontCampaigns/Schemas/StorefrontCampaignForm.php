<?php

namespace App\Filament\Resources\StorefrontCampaigns\Schemas;

use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\FileUpload;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Schema;

class StorefrontCampaignForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('title')
                    ->required()
                    ->maxLength(160),
                TextInput::make('eyebrow')
                    ->maxLength(120),
                Textarea::make('body')
                    ->maxLength(2000)
                    ->rows(4)
                    ->columnSpanFull(),
                FileUpload::make('image_path')
                    ->label('Campaign image')
                    ->image()
                    ->disk('public')
                    ->directory('campaigns')
                    ->visibility('public')
                    ->maxSize(5120)
                    ->imageEditor()
                    ->required()
                    ->columnSpanFull(),
                TextInput::make('image_alt')
                    ->label('Image description (alt text)')
                    ->required()
                    ->maxLength(200)
                    ->columnSpanFull(),
                TextInput::make('cta_label')
                    ->maxLength(80),
                Select::make('cta_action')
                    ->options([
                        'menu' => 'Browse the menu',
                        'custom_cake' => 'Open custom cake request',
                    ])
                    ->required()
                    ->default('menu'),
                TextInput::make('sort_order')
                    ->numeric()
                    ->integer()
                    ->minValue(0)
                    ->maxValue(65535)
                    ->required()
                    ->default(0),
                Toggle::make('is_active')
                    ->label('Published')
                    ->default(false),
                DateTimePicker::make('starts_at')
                    ->timezone('Asia/Dhaka'),
                DateTimePicker::make('ends_at')
                    ->timezone('Asia/Dhaka')
                    ->after('starts_at'),
            ]);
    }
}

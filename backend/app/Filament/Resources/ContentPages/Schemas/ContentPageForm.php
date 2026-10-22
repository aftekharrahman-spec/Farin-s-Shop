<?php

namespace App\Filament\Resources\ContentPages\Schemas;

use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Schema;

class ContentPageForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('title')
                    ->required()
                    ->maxLength(160),
                TextInput::make('slug')
                    ->required()
                    ->maxLength(180)
                    ->alphaDash()
                    ->unique(ignoreRecord: true),
                Textarea::make('summary')
                    ->maxLength(1000)
                    ->columnSpanFull(),
                Textarea::make('body')
                    ->required()
                    ->maxLength(20000)
                    ->rows(14)
                    ->helperText('Plain text only; line breaks are preserved on the storefront.')
                    ->columnSpanFull(),
                TextInput::make('seo_title')
                    ->maxLength(180),
                TextInput::make('seo_description')
                    ->maxLength(320)
                    ->columnSpanFull(),
                Toggle::make('is_published')
                    ->label('Published')
                    ->default(false),
            ]);
    }
}

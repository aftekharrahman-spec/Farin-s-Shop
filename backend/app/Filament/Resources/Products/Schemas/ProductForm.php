<?php

namespace App\Filament\Resources\Products\Schemas;

use Filament\Forms\Components\FileUpload;
use Filament\Forms\Components\Repeater;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Schema;
use Illuminate\Support\Facades\Storage;

class ProductForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Select::make('category_id')
                    ->relationship('category', 'name')
                    ->label('Category')
                    ->required()
                    ->searchable()
                    ->preload(),
                TextInput::make('name')
                    ->required()
                    ->maxLength(160),
                TextInput::make('slug')
                    ->required()
                    ->maxLength(180)
                    ->alphaDash()
                    ->unique(ignoreRecord: true),
                TextInput::make('subtitle')
                    ->required()
                    ->maxLength(200),
                Textarea::make('description')
                    ->required()
                    ->maxLength(5000)
                    ->columnSpanFull(),
                Repeater::make('images')
                    ->relationship()
                    ->label('Product gallery')
                    ->orderColumn('sort_order')
                    ->maxItems(12)
                    ->reorderable()
                    ->collapsible()
                    ->helperText('Upload up to 12 images (5 MB each), add accessible descriptions, and drag to change their display order.')
                    ->schema([
                        FileUpload::make('path')
                            ->label('Product image')
                            ->image()
                            ->disk('public')
                            ->directory('products')
                            ->visibility('public')
                            ->maxSize(5120)
                            ->imageEditor()
                            ->required()
                            ->deleteUploadedFileUsing(
                                fn (?string $file): bool => filled($file) && Storage::disk('public')->delete($file),
                            )
                            ->columnSpanFull(),
                        TextInput::make('alt_text')
                            ->label('Image description')
                            ->required()
                            ->maxLength(200)
                            ->columnSpanFull(),
                    ])
                    ->defaultItems(0)
                    ->addActionLabel('Add product image')
                    ->columnSpanFull(),
                TextInput::make('price')
                    ->required()
                    ->numeric()
                    ->integer()
                    ->minValue(0)
                    ->maxValue(5000000)
                    ->prefix('৳'),
                TextInput::make('tone')
                    ->required()
                    ->regex('/^#[0-9a-fA-F]{6}$/'),
                TextInput::make('frosting')
                    ->required()
                    ->regex('/^#[0-9a-fA-F]{6}$/'),
                TextInput::make('accent')
                    ->required()
                    ->regex('/^#[0-9a-fA-F]{6}$/'),
                TextInput::make('badge'),
                Toggle::make('is_active')
                    ->default(true)
                    ->label('Published'),
            ]);
    }
}

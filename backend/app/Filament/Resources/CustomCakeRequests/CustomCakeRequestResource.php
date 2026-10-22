<?php

namespace App\Filament\Resources\CustomCakeRequests;

use App\Filament\Resources\CustomCakeRequests\Pages\ListCustomCakeRequests;
use App\Models\CustomCakeRequest;
use BackedEnum;
use Filament\Actions\Action;
use Filament\Forms\Components\Select;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class CustomCakeRequestResource extends Resource
{
    protected static ?string $model = CustomCakeRequest::class;

    protected static ?string $navigationLabel = 'Custom cake requests';

    protected static ?int $navigationSort = 5;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedCake;

    public static function form(Schema $schema): Schema
    {
        return $schema->components([]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('customer_name')
                    ->label('Customer')
                    ->searchable(),
                TextColumn::make('customer_phone')
                    ->label('Phone')
                    ->searchable(),
                TextColumn::make('details')
                    ->wrap()
                    ->limit(100),
                TextColumn::make('status')
                    ->badge()
                    ->formatStateUsing(fn (string $state): string => str_replace('_', ' ', ucfirst($state)))
                    ->sortable(),
                TextColumn::make('created_at')
                    ->dateTime('d M Y, H:i')
                    ->timezone('Asia/Dhaka')
                    ->sortable(),
            ])
            ->defaultSort('created_at', 'desc')
            ->recordActions([
                Action::make('updateStatus')
                    ->label('Update status')
                    ->schema([
                        Select::make('status')
                            ->options(fn (CustomCakeRequest $record): array => $record->allowedNextStatuses())
                            ->required(),
                    ])
                    ->action(fn (CustomCakeRequest $record, array $data) => $record->transitionStatus($data['status']))
                    ->visible(fn (CustomCakeRequest $record): bool => $record->allowedNextStatuses() !== []),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => ListCustomCakeRequests::route('/'),
        ];
    }
}

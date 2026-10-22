<?php

namespace App\Filament\Widgets;

use App\Models\Category;
use App\Models\CustomCakeRequest;
use App\Models\DeliveryZone;
use App\Models\Order;
use App\Models\Product;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class StoreOverview extends BaseWidget
{
    protected function getStats(): array
    {
        return [
            Stat::make('Orders awaiting confirmation', Order::query()->where('status', 'pending_confirmation')->count())
                ->description('Guest orders to review')
                ->color('warning'),
            Stat::make('Custom cake requests', CustomCakeRequest::query()->where('status', 'pending_review')->count())
                ->description('Requests awaiting a reply')
                ->color('info'),
            Stat::make('Published products', Product::query()->where('is_active', true)->count())
                ->description(Category::query()->where('is_active', true)->count().' active categories')
                ->color('success'),
            Stat::make('Active delivery zones', DeliveryZone::query()->where('is_active', true)->count())
                ->description('Confirm real coverage before launch')
                ->color('gray'),
        ];
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\StorefrontCampaignResource;
use App\Models\ContentPage;
use App\Models\HomeContent;
use App\Models\StorefrontCampaign;
use Illuminate\Http\JsonResponse;

class ContentController extends Controller
{
    public function home(): JsonResponse
    {
        $content = HomeContent::query()->find(HomeContent::SINGLETON_ID);

        if (! $content) {
            return response()->json([
                'message' => 'Home content has not been configured yet.',
            ], 503);
        }

        return response()->json([
            'data' => [
                'announcement_text' => $content->announcement_text,
                'announcement_enabled' => $content->announcement_enabled,
                'announcement_side_text' => $content->announcement_side_text,
                'hero_eyebrow' => $content->hero_eyebrow,
                'hero_title_line_one' => $content->hero_title_line_one,
                'hero_title_line_two' => $content->hero_title_line_two,
                'hero_title_accent' => $content->hero_title_accent,
                'hero_description' => $content->hero_description,
                'hero_note' => $content->hero_note,
            ],
            'meta' => ['is_demo' => (bool) config('services.farins.demo_catalog')],
        ]);
    }

    public function pages(): JsonResponse
    {
        return response()->json([
            'data' => ContentPage::query()
                ->where('is_published', true)
                ->orderBy('title')
                ->get(['title', 'slug', 'summary']),
            'meta' => ['is_demo' => (bool) config('services.farins.demo_catalog')],
        ]);
    }

    public function page(string $slug): JsonResponse
    {
        $page = ContentPage::query()
            ->where('slug', $slug)
            ->where('is_published', true)
            ->firstOrFail(['title', 'slug', 'summary', 'body', 'seo_title', 'seo_description']);

        return response()->json([
            'data' => $page,
            'meta' => ['is_demo' => (bool) config('services.farins.demo_catalog')],
        ]);
    }

    public function campaigns(): JsonResponse
    {
        return response()->json([
            'data' => StorefrontCampaignResource::collection(
                StorefrontCampaign::query()
                    ->currentlyActive()
                    ->orderBy('sort_order')
                    ->orderBy('id')
                    ->get(),
            )->resolve(request()),
            'meta' => ['is_demo' => (bool) config('services.farins.demo_catalog')],
        ]);
    }
}

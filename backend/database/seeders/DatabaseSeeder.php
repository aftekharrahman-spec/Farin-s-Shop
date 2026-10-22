<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\ContentPage;
use App\Models\DeliveryZone;
use App\Models\HomeContent;
use App\Models\Product;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'কেক', 'slug' => 'cakes', 'sort_order' => 1],
            ['name' => 'পুডিং', 'slug' => 'puddings', 'sort_order' => 2],
            ['name' => 'কুকিজ', 'slug' => 'cookies', 'sort_order' => 3],
        ];

        foreach ($categories as $category) {
            Category::query()->updateOrCreate(
                ['slug' => $category['slug']],
                [...$category, 'is_active' => true],
            );
        }

        $products = [
            [
                'category' => 'cakes',
                'name' => 'স্ট্রবেরি ড্রিম',
                'slug' => 'strawberry-dream',
                'subtitle' => 'ভ্যানিলা স্পঞ্জ · ফ্রেশ ক্রিম',
                'description' => 'রাজশাহীতে আপনার উদযাপনের জন্য যত্ন করে তৈরি ভ্যানিলা কেক।',
                'price' => 1250,
                'tone' => '#F2D8C7',
                'frosting' => '#FFF4E8',
                'accent' => '#C96657',
                'badge' => 'বেস্টসেলার',
            ],
            [
                'category' => 'puddings',
                'name' => 'ক্লাসিক ক্যারামেল',
                'slug' => 'classic-caramel-pudding',
                'subtitle' => 'সিল্কি ক্যারামেল · ৬ পিস',
                'description' => 'মসৃণ ক্যারামেল পুডিং, শেয়ার করার জন্য ছয়টি পরিবেশন।',
                'price' => 450,
                'tone' => '#F3DBBB',
                'frosting' => '#D4934B',
                'accent' => '#9C592E',
                'badge' => 'জনপ্রিয়',
            ],
            [
                'category' => 'cakes',
                'name' => 'চকলেট ফাজ কেক',
                'slug' => 'chocolate-fudge-cake',
                'subtitle' => 'ডার্ক চকলেট · ১ পাউন্ড',
                'description' => 'ডার্ক চকলেটের সমৃদ্ধ স্বাদের এক পাউন্ড কেক।',
                'price' => 1450,
                'tone' => '#E8C8B0',
                'frosting' => '#6C4237',
                'accent' => '#E4B879',
                'badge' => null,
            ],
            [
                'category' => 'cookies',
                'name' => 'বাটার কুকিজ বক্স',
                'slug' => 'butter-cookies-box',
                'subtitle' => 'হ্যান্ডমেড · ১২ পিস',
                'description' => 'চায়ের সঙ্গে পরিবেশনের জন্য বারোটি হাতে তৈরি বাটার কুকিজ।',
                'price' => 380,
                'tone' => '#F5E5CD',
                'frosting' => '#D2A36D',
                'accent' => '#A86D42',
                'badge' => null,
            ],
        ];

        foreach ($products as $product) {
            $category = Category::query()->where('slug', $product['category'])->firstOrFail();
            unset($product['category']);
            Product::query()->updateOrCreate(
                ['slug' => $product['slug']],
                [...$product, 'category_id' => $category->id, 'is_active' => true],
            );
        }

        foreach ([
            ['name' => 'Boalia (demo zone)', 'area_code' => 'demo-boalia', 'delivery_fee' => 60, 'free_delivery_threshold' => 1500],
            ['name' => 'Rajpara (demo zone)', 'area_code' => 'demo-rajpara', 'delivery_fee' => 60, 'free_delivery_threshold' => 1500],
            ['name' => 'Motihar (demo zone)', 'area_code' => 'demo-motihar', 'delivery_fee' => 80, 'free_delivery_threshold' => 1500],
        ] as $zone) {
            DeliveryZone::query()->updateOrCreate(
                ['area_code' => $zone['area_code']],
                [...$zone, 'is_active' => true],
            );
        }

        HomeContent::query()->firstOrCreate(
            ['id' => HomeContent::SINGLETON_ID],
            [
                'announcement_text' => 'রাজশাহীতে ফ্রি ডেলিভারি ৳১,৫০০+ অর্ডারে',
                'announcement_enabled' => true,
                'announcement_side_text' => 'প্রতিদিন, সকাল ১০টা — রাত ১০টা',
                'hero_eyebrow' => 'রাজশাহীর ছোট্ট বেকারি, অনেকটা ভালোবাসা',
                'hero_title_line_one' => 'প্রতিটি',
                'hero_title_line_two' => 'উদযাপনে',
                'hero_title_accent' => 'একটু মিষ্টি।',
                'hero_description' => 'যত্ন করে বানানো কেক আর পুডিং—আপনার বিশেষ মুহূর্তকে আরও মনে রাখার মতো করে তুলতে।',
                'hero_note' => 'প্রতিটি অর্ডার ফ্রেশলি বেকড',
            ],
        );

        foreach ([
            [
                'title' => 'আমাদের গল্প',
                'slug' => 'about',
                'summary' => 'Farin’s Kitchen সম্পর্কে জানুন।',
                'body' => 'Farin’s Kitchen একটি স্থানীয় বেকারি স্টোরফ্রন্টের ডেমো। এখানে আমাদের প্রকৃত গল্প, ঠিকানা ও ব্যবসার তথ্য প্রকাশের আগে মালিকের অনুমোদিত তথ্য দিয়ে এই লেখা বদলে দিন।',
            ],
            [
                'title' => 'প্রায়শই জিজ্ঞাসিত প্রশ্ন',
                'slug' => 'faq',
                'summary' => 'অর্ডার, কাস্টম কেক ও ডেলিভারি সম্পর্কে সাধারণ প্রশ্ন।',
                'body' => "অর্ডার কীভাবে দেব?\nমেনু থেকে পণ্য বেছে কার্টে যোগ করে গেস্ট চেকআউট সম্পন্ন করুন।\n\nকাস্টম কেক কীভাবে চাইব?\nকাস্টম কেক ফর্মে যোগাযোগের তথ্য ও অনুরোধ পাঠান; টিম পরে নিশ্চিত করবে।\n\nডেলিভারি কোথায় হয়?\nবর্তমান এলাকা ও চার্জ ডেমো; প্রকৃত সেবা-এলাকা নিশ্চিত করতে দোকানের সঙ্গে যোগাযোগ করুন।",
            ],
            [
                'title' => 'ডেলিভারি ও রিটার্ন নীতি',
                'slug' => 'delivery-policy',
                'summary' => 'ডেলিভারি ও অর্ডার পরিবর্তনের তথ্য।',
                'body' => 'এই নীতির লেখা ডেমো। চালুর আগে প্রকৃত ডেলিভারি এলাকা, সময়, চার্জ, অর্ডার পরিবর্তন এবং বাতিলের নিয়ম দিয়ে আপডেট করুন।',
            ],
            [
                'title' => 'গোপনীয়তা নীতি',
                'slug' => 'privacy',
                'summary' => 'গ্রাহকের তথ্য ব্যবহারের বিষয়ে।',
                'body' => 'এই গোপনীয়তা নীতির লেখা ডেমো, আইনি পরামর্শ নয়। বাস্তব তথ্য সংগ্রহ ও প্রক্রিয়াকরণের সঙ্গে মিলিয়ে চালুর আগে একটি পর্যালোচিত নীতি প্রকাশ করুন।',
            ],
            [
                'title' => 'শর্তাবলি',
                'slug' => 'terms',
                'summary' => 'ওয়েবসাইট ও অর্ডার ব্যবহারের শর্ত।',
                'body' => 'এই শর্তাবলির লেখা ডেমো, আইনি পরামর্শ নয়। প্রকৃত অর্ডার, মূল্য, পেমেন্ট, বাতিল ও বিরোধ নিষ্পত্তির নিয়ম দিয়ে চালুর আগে আপডেট করুন।',
            ],
        ] as $page) {
            ContentPage::query()->firstOrCreate(
                ['slug' => $page['slug']],
                [...$page, 'is_published' => true],
            );
        }
    }
}

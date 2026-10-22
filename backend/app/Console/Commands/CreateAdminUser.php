<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

class CreateAdminUser extends Command
{
    protected $signature = 'farins:make-admin';

    protected $description = 'Create an administrator account for the Farin\'s Kitchen admin panel.';

    public function handle(): int
    {
        $name = trim((string) $this->ask('Administrator name'));
        $email = mb_strtolower(trim((string) $this->ask('Administrator email')));

        $validator = Validator::make(
            ['name' => $name, 'email' => $email],
            ['name' => ['required', 'string', 'min:2', 'max:120'], 'email' => ['required', 'email', 'max:255', 'unique:users,email']],
        );

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->components->error($error);
            }

            return self::FAILURE;
        }

        $password = (string) $this->secret('Password (at least 12 characters)');
        $passwordValidator = Validator::make(
            ['password' => $password],
            ['password' => ['required', Password::min(12)->mixedCase()->letters()->numbers()]],
        );

        if ($passwordValidator->fails()) {
            foreach ($passwordValidator->errors()->all() as $error) {
                $this->components->error($error);
            }

            return self::FAILURE;
        }

        if ($password !== (string) $this->secret('Confirm password')) {
            $this->components->error('The password confirmation does not match.');

            return self::FAILURE;
        }

        $user = User::query()->create([
            'name' => $name,
            'email' => $email,
            'password' => $password,
        ]);
        $user->email_verified_at = now();
        $user->role = 'admin';
        $user->save();

        $this->components->info("Administrator account created for {$email}.");

        return self::SUCCESS;
    }
}

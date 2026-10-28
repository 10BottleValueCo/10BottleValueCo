<?php
/**
 * Sign in / Create account, in the live storefront's account card.
 * Field names, nonces and hooks follow WooCommerce's own form-login.php.
 */
defined('ABSPATH') || exit;
$tbv_register_open = 'yes' === get_option('woocommerce_enable_myaccount_registration');
$tbv_mode = $tbv_register_open && (isset($_POST['register']) || ($_GET['action'] ?? '') === 'register') ? 'create' : 'signin';
$tbv_field = 'box-border min-w-0 flex min-h-[72px] w-full items-center gap-4 rounded-[1.5rem] border border-white/25 bg-white/[0.04] px-5 transition-colors focus-within:border-white/45 focus-within:bg-white/[0.07] sm:min-h-[84px] sm:px-8';
$tbv_input = 'min-w-0 flex-1 bg-transparent text-base text-white placeholder:text-white/75 outline-none sm:text-lg';
$tbv_tab = 'inline-flex min-h-[64px] items-center justify-center rounded-full px-8 py-4 text-sm font-bold uppercase tracking-[0.22em] transition-colors sm:min-h-[72px] sm:px-10 sm:text-base';
$tbv_submit = 'box-border min-w-0 mt-2 inline-flex min-h-[68px] w-full items-center justify-center gap-4 rounded-full bg-black px-8 py-5 text-[11px] font-black uppercase tracking-[0.22em] text-white shadow-[0_10px_30px_rgba(0,0,0,0.18)] transition-colors hover:bg-black/90 sm:w-fit sm:min-w-[300px] sm:min-h-[76px] sm:px-10';
$tbv_mail_icon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="h-7 w-7 shrink-0 text-white/90" aria-hidden="true"><path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"></path><rect x="2" y="4" width="20" height="16" rx="2"></rect></svg>';
$tbv_lock_icon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="h-7 w-7 shrink-0 text-white/90" aria-hidden="true"><circle cx="12" cy="16" r="1"></circle><rect x="3" y="10" width="18" height="12" rx="2"></rect><path d="M7 10V7a5 5 0 0 1 10 0v3"></path></svg>';
$tbv_eye = '<button type="button" data-tbv-reveal aria-label="Show password" class="shrink-0 text-white/75 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6" aria-hidden="true"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"></path><circle cx="12" cy="12" r="3"></circle></svg></button>';
$tbv_arrow = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6" aria-hidden="true"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>';
?>
<div class="tbv-auth box-border min-w-0 w-full rounded-[2rem] border border-white/30 bg-black/40 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.3)] backdrop-blur-2xl sm:p-8 md:mx-auto md:w-4/5 md:[zoom:0.8] md:p-14" data-mode="<?php echo esc_attr($tbv_mode); ?>">
  <div class="relative mt-3 inline-block">
    <h1 class="inline-flex items-center gap-2 font-sans font-semibold tracking-[-0.04em] uppercase sm:gap-4 text-4xl sm:text-5xl md:text-6xl"><span data-show="signin">Sign in</span><span data-show="create">Create account</span>
      <div class="self-center shrink-0 select-none" data-show="signin" style="margin-top:-18px" aria-hidden="true"><?php echo file_get_contents(__DIR__ . '/../../parts/padlock.svg'); // phpcs:ignore -- static theme asset ?></div>
    </h1>
  </div>
  <p class="mt-5 max-w-3xl text-[12px] leading-7 tracking-[0.16em] uppercase text-white/75 sm:text-[13px]"><span data-show="signin">Access your account and review your orders.</span><span data-show="create">Create an account to view orders and place new ones.</span></p>

  <div class="tbv-auth-notices mt-5"><?php do_action('woocommerce_before_customer_login_form'); ?></div>

  <?php if ($tbv_register_open): ?>
  <div class="mt-8 flex flex-wrap gap-4">
    <button type="button" data-tbv-mode="signin" class="<?php echo esc_attr($tbv_tab); ?> min-w-[176px]">Sign In</button>
    <button type="button" data-tbv-mode="create" class="<?php echo esc_attr($tbv_tab); ?> min-w-[260px]">Create Account</button>
  </div>
  <?php endif; ?>

  <form class="woocommerce-form woocommerce-form-login login box-border min-w-0 mt-7 grid w-full max-w-4xl gap-4 sm:gap-5" method="post" data-show="signin" novalidate>
    <?php do_action('woocommerce_login_form_start'); ?>
    <label class="<?php echo esc_attr($tbv_field); ?>"><?php echo $tbv_mail_icon; ?><input type="text" name="username" id="username" placeholder="Email" aria-label="Email" autocomplete="username" required class="<?php echo esc_attr($tbv_input); ?>" value="<?php echo !empty($_POST['username']) && is_string($_POST['username']) ? esc_attr(wp_unslash($_POST['username'])) : ''; ?>"></label>
    <div class="<?php echo esc_attr($tbv_field); ?>"><?php echo $tbv_lock_icon; ?><input type="password" name="password" id="password" placeholder="Password" aria-label="Password" autocomplete="current-password" required class="<?php echo esc_attr($tbv_input); ?>"><?php echo $tbv_eye; ?></div>
    <?php do_action('woocommerce_login_form'); ?>
    <input type="hidden" name="rememberme" value="forever">
    <a href="<?php echo esc_url(wp_lostpassword_url()); ?>" class="w-fit text-[11px] font-bold uppercase tracking-[0.18em] text-white/80 transition-colors hover:text-white">Forgot password?</a>
    <?php wp_nonce_field('woocommerce-login', 'woocommerce-login-nonce'); ?>
    <button type="submit" name="login" value="Log in" class="<?php echo esc_attr($tbv_submit); ?>">Continue<?php echo $tbv_arrow; ?></button>
    <?php do_action('woocommerce_login_form_end'); ?>
  </form>

  <?php if ($tbv_register_open): ?>
  <form class="woocommerce-form woocommerce-form-register register box-border min-w-0 mt-7 grid w-full max-w-4xl gap-4 sm:gap-5" method="post" data-show="create" novalidate <?php do_action('woocommerce_register_form_tag'); ?>>
    <?php do_action('woocommerce_register_form_start'); ?>
    <?php if ('no' === get_option('woocommerce_registration_generate_username')): ?>
    <label class="<?php echo esc_attr($tbv_field); ?>"><input type="text" name="username" id="reg_username" placeholder="Username" aria-label="Username" autocomplete="username" required class="<?php echo esc_attr($tbv_input); ?>" value="<?php echo !empty($_POST['username']) && is_string($_POST['username']) ? esc_attr(wp_unslash($_POST['username'])) : ''; ?>"></label>
    <?php endif; ?>
    <label class="<?php echo esc_attr($tbv_field); ?>"><?php echo $tbv_mail_icon; ?><input type="email" name="email" id="reg_email" placeholder="Email" aria-label="Email" autocomplete="email" required class="<?php echo esc_attr($tbv_input); ?>" value="<?php echo !empty($_POST['email']) && is_string($_POST['email']) ? esc_attr(wp_unslash($_POST['email'])) : ''; ?>"></label>
    <?php if ('no' === get_option('woocommerce_registration_generate_password')): ?>
    <div class="<?php echo esc_attr($tbv_field); ?>"><?php echo $tbv_lock_icon; ?><input type="password" name="password" id="reg_password" placeholder="Password" aria-label="Password" autocomplete="new-password" required class="<?php echo esc_attr($tbv_input); ?>"><?php echo $tbv_eye; ?></div>
    <?php endif; ?>
    <div class="tbv-auth-register-extra text-[12px] leading-6 text-white/70"><?php do_action('woocommerce_register_form'); ?></div>
    <?php wp_nonce_field('woocommerce-register', 'woocommerce-register-nonce'); ?>
    <button type="submit" name="register" value="Register" class="<?php echo esc_attr($tbv_submit); ?>">Create account<?php echo $tbv_arrow; ?></button>
    <?php do_action('woocommerce_register_form_end'); ?>
  </form>
  <?php endif; ?>
</div>
<?php do_action('woocommerce_after_customer_login_form'); ?>

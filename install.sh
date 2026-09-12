








<!doctype html>
<html class="h-full overflow-y-scroll">
  <head>
    <title>Ollama</title>

    <meta charset="utf-8" />
    <meta name="description" content="Ollama is the easiest way to automate your work using open models, while keeping your data safe."/>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta property="og:title" content="Ollama" />
    <meta property="og:description" content="Ollama is the easiest way to automate your work using open models, while keeping your data safe." />
    <meta property="og:url" content="https://ollama.com" />
    <meta property="og:image" content="https://ollama.com/public/og.png" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="628" />
    <meta property="og:type" content="website" />

    <meta name="robots" content="index, follow" />

    <meta property="twitter:card" content="summary" />
    <meta property="twitter:title" content="Ollama" />
    <meta property="twitter:description" content="Ollama is the easiest way to automate your work using open models, while keeping your data safe." />
    <meta property="twitter:site" content="ollama" />

    <meta property="twitter:image:src" content="https://ollama.com/public/og-twitter.png" />
    <meta property="twitter:image:width" content="1200" />
    <meta property="twitter:image:height" content="628" />

    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">

    <link rel="icon" type="image/png" sizes="16x16" href="/public/icon-16x16.png" />
    <link rel="icon" type="image/png" sizes="32x32" href="/public/icon-32x32.png" />
    <link rel="icon" type="image/png" sizes="48x48" href="/public/icon-48x48.png" />
    <link rel="icon" type="image/png" sizes="64x64" href="/public/icon-64x64.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="/public/apple-touch-icon.png" />
    <link rel="icon" type="image/png" sizes="192x192" href="/public/android-chrome-icon-192x192.png" />
    <link rel="icon" type="image/png" sizes="512x512" href="/public/android-chrome-icon-512x512.png" />

    
    

    <link href="/public/tailwind.css?v=5ca0a969465cb558b9282100a39f1424" rel="stylesheet" />
    <link href="/public/vendor/prism/prism.css?v=5ca0a969465cb558b9282100a39f1424" rel="stylesheet" />
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "Ollama",
        "url": "https://ollama.com"
      }
    </script>

    <script type="text/javascript">
      function copyToClipboard(element) {
        let commandElement = null;
        const preElement = element.closest('pre');
        const languageNoneElement = element.closest('.language-none');

        if (preElement) {
          commandElement = preElement.querySelector('code');
        } else if (languageNoneElement) {
          commandElement = languageNoneElement.querySelector('.command');
        } else {
          const parent = element.parentElement;
          if (parent) {
            commandElement = parent.querySelector('.command');
          }
        }

        if (!commandElement) {
          console.error('No code or command element found');
          return;
        }

        const code = commandElement.textContent ? commandElement.textContent.trim() : commandElement.value;

        navigator.clipboard
          .writeText(code)
          .then(() => {
            const copyIcon = element.querySelector('.copy-icon')
            const checkIcon = element.querySelector('.check-icon')

            copyIcon.classList.add('hidden')
            checkIcon.classList.remove('hidden')

            setTimeout(() => {
              copyIcon.classList.remove('hidden')
              checkIcon.classList.add('hidden')
            }, 2000)
          })
      }
    </script>
    
    <script>
      
      function getIcon(url) {
        url = url.toLowerCase();
        if (url.includes('x.com') || url.includes('twitter.com')) return 'x';
        if (url.includes('github.com')) return 'github';
        if (url.includes('linkedin.com')) return 'linkedin';
        if (url.includes('youtube.com')) return 'youtube';
        if (url.includes('hf.co') || url.includes('huggingface.co') || url.includes('huggingface.com')) return 'hugging-face';
        return 'default';
      }

      function setInputIcon(input) {
        const icon = getIcon(input.value);
        const img = input.previousElementSibling.querySelector('img');
        img.src = `/public/social/${icon}.svg`;
        img.alt = `${icon} icon`;
      }

      function setDisplayIcon(imgElement, url) {
        const icon = getIcon(url);
        imgElement.src = `/public/social/${icon}.svg`;
        imgElement.alt = `${icon} icon`;
      }
    </script>
    
    <script src="/public/vendor/htmx/bundle.js"></script>
  </head>

  <body
    class="
      antialiased
      min-h-screen
      w-full
      m-0
      flex
      flex-col
    "
    hx-on:keydown="
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        // Ignore key events in input fields.
        return;
      }
      if ((event.metaKey && event.key === 'k') || event.key === '/') {
        event.preventDefault();
        const sp = htmx.find('#search') || htmx.find('#navbar-input');
        sp.focus();
      }
    "
  >
    
        
<header class="sticky top-0 z-40 bg-white underline-offset-4 lg:static">
  <nav class="flex w-full items-center justify-between px-6 py-[9px]">
    <a href="/" class="z-50">
      <img src="/public/ollama.png" class="w-8" alt="Ollama" />
    </a>
    
    
    <div class="hidden lg:flex xl:flex-1 items-center space-x-6 ml-6 mr-6 xl:mr-0 text-lg">
      <a class="hover:underline focus:underline focus:outline-none focus:ring-0" href="/search">Models</a>
      <a class="hover:underline focus:underline focus:outline-none focus:ring-0" href="/docs">Docs</a>
      <a class="hover:underline focus:underline focus:outline-none focus:ring-0" href="/pricing">Pricing</a>
    </div>

    
    <div class="flex-grow justify-center items-center hidden lg:flex">
      <div class="relative w-full xl:max-w-[28rem]">
        
<form action="/search" autocomplete="off">
  <div 
    class="relative flex w-full appearance-none bg-black/5 border border-neutral-100 items-center rounded-full"
    hx-on:focusout="
      if (!this.contains(event.relatedTarget)) {
        const searchPreview = document.querySelector('#searchpreview');
        if (searchPreview) {
          htmx.addClass('#searchpreview', 'hidden');
        }
      }
    "
  >
  <span id="searchIcon" class="pl-2 text-2xl text-neutral-500">
    <svg class="mt-0.25 ml-1.5 h-5 w-5 fill-current" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
      <path d="m8.5 3c3.0375661 0 5.5 2.46243388 5.5 5.5 0 1.24832096-.4158777 2.3995085-1.1166416 3.3225711l4.1469717 4.1470988c.2928932.2928932.2928932.767767 0 1.0606602-.2662666.2662665-.6829303.2904726-.9765418.0726181l-.0841184-.0726181-4.1470988-4.1469717c-.9230626.7007639-2.07425014 1.1166416-3.3225711 1.1166416-3.03756612 0-5.5-2.4624339-5.5-5.5 0-3.03756612 2.46243388-5.5 5.5-5.5zm0 1.5c-2.209139 0-4 1.790861-4 4s1.790861 4 4 4 4-1.790861 4-4-1.790861-4-4-4z" />
    </svg>
  </span>
  <input
    id="search"
    hx-get="/search"
    hx-trigger="keyup changed delay:100ms, focus"
    hx-target="#searchpreview"
    hx-swap="innerHTML"
    name="q"
    class="resize-none rounded-full border-0 py-2.5 bg-transparent text-sm w-full placeholder:text-neutral-500 focus:outline-none focus:ring-0"
    placeholder="Search models"
    autocomplete="off"
    hx-on:keydown="
      if (event.key === 'Enter') {
        event.preventDefault();
        window.location.href = '/search?q=' + encodeURIComponent(this.value);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        this.value = '';
        this.blur();
        htmx.addClass('#searchpreview', 'hidden');
        return;
      }
      if (event.key === 'Tab') { 
        htmx.addClass('#searchpreview', 'hidden');
        return;
      }
      if (event.key === 'ArrowDown') {
        let first = document.querySelector('#search-preview-list a:first-of-type');
        first?.focus();
        event.preventDefault();
      }
      if (event.key === 'ArrowUp') {
        let last = document.querySelector('#view-all-link');
        last?.focus();
        event.preventDefault();
      }
      htmx.removeClass('#searchpreview', 'hidden');
    "
    hx-on:focus="
      htmx.removeClass('#searchpreview', 'hidden')
    "
  />
</form>
<div id="searchpreview" class="hidden absolute left-0 right-0 top-12 z-50" style="width: calc(100% + 2px); margin-left: -1px;"></div>
</div>

      </div>
    </div>

    
    <div class="hidden lg:flex xl:flex-1 items-center space-x-2 justify-end ml-6 xl:ml-0">
      
        <a class="flex cursor-pointer items-center rounded-full bg-black/5 hover:bg-black/10 text-lg px-4 py-1.5 text-black whitespace-nowrap" href="/signin">Sign in</a>
        <a class="flex cursor-pointer items-center rounded-full bg-neutral-800 text-lg px-4 py-1.5 text-white hover:bg-black whitespace-nowrap focus:bg-black" href="/download">Download</a>
      
    </div>
    
    
    <div class="lg:hidden flex items-center">
      <input type="checkbox" id="menu" class="peer hidden" />
      <label for="menu" class="z-50 cursor-pointer peer-checked:hidden block">
        <svg
          class="h-8 w-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
          />
        </svg>
      </label>
      <label for="menu" class="z-50 cursor-pointer hidden peer-checked:block fixed top-4 right-6">
        <svg
          class="h-8 w-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </label>
      
      <div class="fixed inset-0 bg-white z-40 hidden peer-checked:block overflow-y-auto">
        <div class="flex flex-col space-y-5 pt-[5.5rem] text-3xl">
          

          
          <a class="px-6" href="/search">Models</a>
          <a class="px-6" href="/download">Download</a>
          <a class="px-6" href="/docs">Docs</a>
          <a class="px-6" href="/pricing">Pricing</a>

          
          <a href="/signin" class="block px-6">Sign in</a>
          

          
        </div>
      </div>
    </div>
  </nav>
</header>

    

    
<main class="w-full pb-20 pt-12 md:pb-28 md:pt-20">
  <section class="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-10 px-6 md:grid-cols-[0.78fr_1.22fr] md:gap-12">
    <div>
      <h1 class="text-4xl font-medium leading-[1.05] tracking-tight md:text-5xl lg:text-[3.5rem]">Run open models.<br />Get more usage.</h1>
      <p class="mt-5 max-w-md text-lg leading-relaxed text-neutral-500">Ollama lets you use open models with your coding agents so you can spend less while keeping your data private.</p>
      <div class="mt-8">
        <a href="/download" class="inline-flex items-center justify-center rounded-full bg-neutral-900 px-8 py-3.5 text-base text-white hover:bg-black">Download</a>
      </div>
    </div>
    <video class="aspect-[1440/932] w-full rounded-2xl bg-neutral-900 object-cover shadow-2xl shadow-black/10"
           autoplay muted loop playsinline preload="metadata" aria-hidden="true"
           poster="/public/hero-poster.jpg">
      <source src="https://files.ollama.com/ollama-hero.mp4" type="video/mp4" />
    </video>
  </section>

  
  <section class="mt-16 md:mt-20">
    <p class="mx-auto max-w-4xl px-6 text-center text-sm text-neutral-400">Trusted by more than 9M developers</p>
    <div class="relative mt-6 overflow-hidden">
      <div class="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-white to-transparent md:w-32"></div>
      <div class="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-white to-transparent md:w-32"></div>
      <div class="flex w-max animate-marquee items-center motion-reduce:animate-none">
        <div class="flex shrink-0 items-center">
  <img src="/public/logos/apple.svg" alt="Apple" class="mx-6 h-[29px] w-auto shrink-0 opacity-40 md:mx-9" />
  <img src="/public/logos/nike.svg" alt="Nike" class="mx-6 h-[17px] w-auto shrink-0 opacity-40 md:mx-9" />
  <img src="/public/logos/microsoft.svg" alt="Microsoft" class="mx-6 h-[22px] w-auto shrink-0 opacity-40 md:mx-9" />
  <img src="/public/logos/meta.svg" alt="Meta" class="mx-6 h-[21px] w-auto shrink-0 opacity-40 md:mx-9" />
  <img src="/public/logos/nasa.svg" alt="NASA" class="mx-6 h-[17px] w-auto shrink-0 opacity-40 md:mx-9" />
  <img src="/public/logos/netflix.svg" alt="Netflix" class="mx-6 h-[30px] w-auto shrink-0 opacity-40 md:mx-9" />
  <img src="/public/logos/nvidia.svg" alt="NVIDIA" class="mx-6 h-[19px] w-auto shrink-0 opacity-40 md:mx-9" />
  <img src="/public/logos/adobe.svg" alt="Adobe" class="mx-6 h-[24px] w-auto shrink-0 opacity-40 md:mx-9" />
  <img src="/public/logos/ibm.svg" alt="IBM" class="mx-6 h-[17px] w-auto shrink-0 opacity-40 md:mx-9" />
  <img src="/public/logos/bmw.svg" alt="BMW" class="mx-6 h-[26px] w-auto shrink-0 opacity-40 md:mx-9" />
  <img src="/public/logos/mercedes.svg" alt="Mercedes-Benz" class="mx-6 h-[26px] w-auto shrink-0 opacity-40 md:mx-9" />
  <img src="/public/logos/intel.svg" alt="Intel" class="mx-6 h-[17px] w-auto shrink-0 opacity-40 md:mx-9" />
  <img src="/public/logos/volvo.svg" alt="Volvo" class="mx-6 h-[26px] w-auto shrink-0 opacity-40 md:mx-9" />
  <img src="/public/logos/salesforce.svg" alt="Salesforce" class="mx-6 h-[24px] w-auto shrink-0 opacity-40 md:mx-9" />
  <img src="/public/logos/databricks.svg" alt="Databricks" class="mx-6 h-[19px] w-auto shrink-0 opacity-40 md:mx-9" />
  <img src="/public/logos/intuit.svg" alt="Intuit" class="mx-6 h-[17px] w-auto shrink-0 opacity-40 md:mx-9" />
  <img src="/public/logos/mit.svg" alt="MIT" class="mx-6 h-[19px] w-auto shrink-0 opacity-40 md:mx-9" />
  <img src="/public/logos/walmart.svg" alt="Walmart" class="mx-6 h-[17px] w-auto shrink-0 opacity-40 md:mx-9" />
  <img src="/public/logos/visa.svg" alt="Visa" class="mx-6 h-[17px] w-auto shrink-0 opacity-40 md:mx-9" />
</div>
        <div class="flex shrink-0 items-center" aria-hidden="true">
  <img src="/public/logos/apple.svg" alt="Apple" class="mx-6 h-[29px] w-auto shrink-0 opacity-40 md:mx-9" />
  <img src="/public/logos/nike.svg" alt="Nike" class="mx-6 h-[17px] w-auto shrink-0 opacity-40 md:mx-9" />
  <img src="/public/logos/microsoft.svg" alt="Microsoft" class="mx-6 h-[22px] w-auto shrink-0 opacity-40 md:mx-9" />
  <img src="/public/logos/meta.svg" alt="Meta" class="mx-6 h-[21px] w-auto shrink-0 opacity-40 md:mx-9" />
  <img src="/public/logos/nasa.svg" alt="NASA" class="mx-6 h-[17px] w-auto shrink-0 opacity-40 md:mx-9" />
  <img src="/public/logos/netflix.svg" alt="Netflix" class="mx-6 h-[30px] w-auto shrink-0 opacity-40 md:mx-9" />
  <img src="/public/logos/nvidia.svg" alt="NVIDIA" class="mx-6 h-[19px] w-auto shrink-0 opacity-40 md:mx-9" />
  <img src="/public/logos/adobe.svg" alt="Adobe" class="mx-6 h-[24px] w-auto shrink-0 opacity-40 md:mx-9" />
  <img src="/public/logos/ibm.svg" alt="IBM" class="mx-6 h-[17px] w-auto shrink-0 opacity-40 md:mx-9" />
  <img src="/public/logos/bmw.svg" alt="BMW" class="mx-6 h-[26px] w-auto shrink-0 opacity-40 md:mx-9" />
  <img src="/public/logos/mercedes.svg" alt="Mercedes-Benz" class="mx-6 h-[26px] w-auto shrink-0 opacity-40 md:mx-9" />
  <img src="/public/logos/intel.svg" alt="Intel" class="mx-6 h-[17px] w-auto shrink-0 opacity-40 md:mx-9" />
  <img src="/public/logos/volvo.svg" alt="Volvo" class="mx-6 h-[26px] w-auto shrink-0 opacity-40 md:mx-9" />
  <img src="/public/logos/salesforce.svg" alt="Salesforce" class="mx-6 h-[24px] w-auto shrink-0 opacity-40 md:mx-9" />
  <img src="/public/logos/databricks.svg" alt="Databricks" class="mx-6 h-[19px] w-auto shrink-0 opacity-40 md:mx-9" />
  <img src="/public/logos/intuit.svg" alt="Intuit" class="mx-6 h-[17px] w-auto shrink-0 opacity-40 md:mx-9" />
  <img src="/public/logos/mit.svg" alt="MIT" class="mx-6 h-[19px] w-auto shrink-0 opacity-40 md:mx-9" />
  <img src="/public/logos/walmart.svg" alt="Walmart" class="mx-6 h-[17px] w-auto shrink-0 opacity-40 md:mx-9" />
  <img src="/public/logos/visa.svg" alt="Visa" class="mx-6 h-[17px] w-auto shrink-0 opacity-40 md:mx-9" />
</div>
      </div>
    </div>
  </section>

  <style>
    .rail-fill { transform: scaleX(0); transform-origin: left; }
    #closer-mascot { opacity: 0; transform: translateY(14px); transition: opacity 700ms ease, transform 700ms ease; }
    #closer-mascot.is-in { opacity: 1; transform: none; }
    @media (prefers-reduced-motion: reduce) { #closer-mascot { opacity: 1; transform: none; transition: none; } }
  </style>

  
  <section class="mx-auto mt-24 w-full max-w-6xl px-6 md:mt-36" id="rail">
    <div class="grid grid-cols-1 gap-10 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-16 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-24">
      <nav class="hidden md:block" aria-label="Product highlights">
        <div class="sticky top-24">
          <a href="#rail-1" data-rail-nav="1" class="block py-3.5 text-base text-neutral-400 transition-colors hover:text-neutral-600">Reliably fast<span aria-hidden="true" class="relative mt-2 block h-px w-full bg-neutral-200"><span class="rail-fill absolute left-0 top-0 block h-[2px] w-full origin-left bg-neutral-900"></span></span></a>
          <a href="#rail-2" data-rail-nav="2" class="block py-3.5 text-base text-neutral-400 transition-colors hover:text-neutral-600">Frontier open models<span aria-hidden="true" class="relative mt-2 block h-px w-full bg-neutral-200"><span class="rail-fill absolute left-0 top-0 block h-[2px] w-full origin-left bg-neutral-900"></span></span></a>
          <a href="#rail-3" data-rail-nav="3" class="block py-3.5 text-base text-neutral-400 transition-colors hover:text-neutral-600">Keep your setup<span aria-hidden="true" class="relative mt-2 block h-px w-full bg-neutral-200"><span class="rail-fill absolute left-0 top-0 block h-[2px] w-full origin-left bg-neutral-900"></span></span></a>
          <a href="#rail-4" data-rail-nav="4" class="block py-3.5 text-base text-neutral-400 transition-colors hover:text-neutral-600">Your data stays yours<span aria-hidden="true" class="relative mt-2 block h-px w-full bg-neutral-200"><span class="rail-fill absolute left-0 top-0 block h-[2px] w-full origin-left bg-neutral-900"></span></span></a>
          
        </div>
      </nav>

      <div class="space-y-20 md:space-y-32">
        <article id="rail-1" data-rail-panel="1" class="scroll-mt-28">
          <h2 class="text-2xl font-medium tracking-tight md:text-3xl">Reliably fast</h2>
          <p class="mt-4 max-w-xl text-base leading-relaxed text-neutral-500">The same open models, served faster. Dedicated capacity so throughput holds up when you are running several agents at once.</p>
          <figure class="mt-8">
            <div class="text-right text-xs text-neutral-400">tokens/sec</div>
            <div class="mt-4 space-y-4">
              <div class="grid grid-cols-[7rem_minmax(0,1fr)_3rem] items-center gap-x-4 sm:grid-cols-[9rem_minmax(0,1fr)_3.5rem]">
                <span class="truncate text-sm font-medium text-neutral-900">Ollama</span>
                <span class="h-2.5 bg-neutral-900" style="width: 100.0%"></span>
                <span class="text-right text-sm tabular-nums font-medium text-neutral-900">195.6</span>
              </div>
              <div class="grid grid-cols-[7rem_minmax(0,1fr)_3rem] items-center gap-x-4 sm:grid-cols-[9rem_minmax(0,1fr)_3.5rem]">
                <span class="truncate text-sm text-neutral-500">Provider A</span>
                <span class="h-2.5 bg-neutral-300" style="width: 49.9%"></span>
                <span class="text-right text-sm tabular-nums text-neutral-500">97.6</span>
              </div>
              <div class="grid grid-cols-[7rem_minmax(0,1fr)_3rem] items-center gap-x-4 sm:grid-cols-[9rem_minmax(0,1fr)_3.5rem]">
                <span class="truncate text-sm text-neutral-500">Provider B</span>
                <span class="h-2.5 bg-neutral-300" style="width: 32.2%"></span>
                <span class="text-right text-sm tabular-nums text-neutral-500">63</span>
              </div>
              <div class="grid grid-cols-[7rem_minmax(0,1fr)_3rem] items-center gap-x-4 sm:grid-cols-[9rem_minmax(0,1fr)_3.5rem]">
                <span class="truncate text-sm text-neutral-500">Provider C</span>
                <span class="h-2.5 bg-neutral-300" style="width: 25.8%"></span>
                <span class="text-right text-sm tabular-nums text-neutral-500">50.5</span>
              </div>
            </div>
            <figcaption class="mt-6 text-xs leading-relaxed text-neutral-400">Model: DeepSeek v4 Flash. Sources: TokenDyno and provider published figures, August 2026.</figcaption>
          </figure>
        </article>
        <article id="rail-2" data-rail-panel="2" class="scroll-mt-28">
          <h2 class="text-2xl font-medium tracking-tight md:text-3xl">Frontier open models</h2>
          <p class="mt-4 max-w-xl text-base leading-relaxed text-neutral-500">Frontier capability with more usage. The latest open models match the best closed ones, at a fraction of the cost.</p>
          <div class="mt-8">
            <div class="flex items-baseline text-xs text-neutral-400">
              <span class="w-40 shrink-0 sm:w-52"></span>
              <span class="hidden sm:block mx-4 flex-1"></span>
              <span class="w-20 shrink-0 sm:w-24 text-right">score</span>
              <span class="w-16 shrink-0 text-right sm:w-20">cost</span>
            </div>
            <div class="mt-3 space-y-5">
              <div class="flex items-center">
                <div class="flex w-40 shrink-0 items-center gap-2 sm:w-52">
                  <img src="/public/logos/openai.svg" alt="" class="h-4 w-4 shrink-0" />
                  <span class="truncate text-sm text-neutral-800">gpt-5.6-sol</span>
                  <span class="hidden text-xs text-neutral-400 sm:inline">[max]</span>
                </div>
                <div class="hidden sm:block relative mx-4 h-2.5 min-w-0 flex-1">
                  <div class="absolute inset-y-0 left-0 w-[91.25%] bg-neutral-900"></div>
                  <div class="absolute left-[87.5%] top-1/2 h-px w-[7.5%] -translate-y-1/2 bg-neutral-400"></div>
                  <div class="absolute left-[87.5%] top-1/2 h-3 w-px -translate-y-1/2 bg-neutral-400"></div>
                  <div class="absolute left-[95%] top-1/2 h-3 w-px -translate-y-1/2 bg-neutral-400"></div>
                </div>
                <div class="w-20 shrink-0 sm:w-24 text-right text-sm tabular-nums text-neutral-800">73% <span class="text-neutral-400">±3%</span></div>
                <div class="w-16 shrink-0 text-right text-sm tabular-nums text-neutral-500 sm:w-20">$6.46</div>
              </div>
              <div class="flex items-center">
                <div class="flex w-40 shrink-0 items-center gap-2 sm:w-52">
                  <img src="/public/logos/anthropic.svg" alt="" class="h-4 w-4 shrink-0" />
                  <span class="truncate text-sm text-neutral-800">claude-fable-5</span>
                  <span class="hidden text-xs text-neutral-400 sm:inline">[max]</span>
                </div>
                <div class="hidden sm:block relative mx-4 h-2.5 min-w-0 flex-1">
                  <div class="absolute inset-y-0 left-0 w-[87.5%] bg-neutral-900"></div>
                  <div class="absolute left-[82.5%] top-1/2 h-px w-[10%] -translate-y-1/2 bg-neutral-400"></div>
                  <div class="absolute left-[82.5%] top-1/2 h-3 w-px -translate-y-1/2 bg-neutral-400"></div>
                  <div class="absolute left-[92.5%] top-1/2 h-3 w-px -translate-y-1/2 bg-neutral-400"></div>
                </div>
                <div class="w-20 shrink-0 sm:w-24 text-right text-sm tabular-nums text-neutral-800">70% <span class="text-neutral-400">±4%</span></div>
                <div class="w-16 shrink-0 text-right text-sm tabular-nums text-neutral-500 sm:w-20">$21.63</div>
              </div>
              <div class="flex items-center">
                <div class="flex w-40 shrink-0 items-center gap-2 sm:w-52">
                  <img src="/public/logos/kimi.svg" alt="" class="h-4 w-4 shrink-0" />
                  <span class="truncate text-sm text-neutral-800">kimi-k3</span>
                  <span class="hidden text-xs text-neutral-400 sm:inline">[max]</span>
                </div>
                <div class="hidden sm:block relative mx-4 h-2.5 min-w-0 flex-1">
                  <div class="absolute inset-y-0 left-0 w-[86.25%] bg-neutral-900"></div>
                  <div class="absolute left-[80%] top-1/2 h-px w-[12.5%] -translate-y-1/2 bg-neutral-400"></div>
                  <div class="absolute left-[80%] top-1/2 h-3 w-px -translate-y-1/2 bg-neutral-400"></div>
                  <div class="absolute left-[92.5%] top-1/2 h-3 w-px -translate-y-1/2 bg-neutral-400"></div>
                </div>
                <div class="w-20 shrink-0 sm:w-24 text-right text-sm tabular-nums text-neutral-800">69% <span class="text-neutral-400">±5%</span></div>
                <div class="w-16 shrink-0 text-right text-sm tabular-nums text-neutral-500 sm:w-20">$4.65</div>
              </div>
              <div class="flex items-center">
                <div class="flex w-40 shrink-0 items-center gap-2 sm:w-52">
                  <img src="/public/logos/deepseek.svg" alt="" class="h-4 w-4 shrink-0" />
                  <span class="truncate text-sm text-neutral-800">deepseek-v4-pro</span>
                  <span class="hidden text-xs text-neutral-400 sm:inline">[max]</span>
                </div>
                <div class="hidden sm:block relative mx-4 h-2.5 min-w-0 flex-1">
                  <div class="absolute inset-y-0 left-0 w-[78.75%] bg-neutral-900"></div>
                  <div class="absolute left-[71.25%] top-1/2 h-px w-[15%] -translate-y-1/2 bg-neutral-400"></div>
                  <div class="absolute left-[71.25%] top-1/2 h-3 w-px -translate-y-1/2 bg-neutral-400"></div>
                  <div class="absolute left-[86.25%] top-1/2 h-3 w-px -translate-y-1/2 bg-neutral-400"></div>
                </div>
                <div class="w-20 shrink-0 sm:w-24 text-right text-sm tabular-nums text-neutral-800">63% <span class="text-neutral-400">±6%</span></div>
                <div class="w-16 shrink-0 text-right text-sm tabular-nums text-neutral-500 sm:w-20">$1.67</div>
              </div>
            </div>
            <div class="mt-3 hidden sm:flex">
              <span class="w-40 shrink-0 sm:w-52"></span>
              <div class="relative mx-4 h-4 min-w-0 flex-1 text-xs tabular-nums text-neutral-400">
                <span class="absolute left-0">0%</span>
                <span class="absolute left-[25%] -translate-x-1/2">20%</span>
                <span class="absolute left-[50%] -translate-x-1/2">40%</span>
                <span class="absolute left-[75%] -translate-x-1/2">60%</span>
                <span class="absolute right-0">80%</span>
              </div>
              <span class="w-20 shrink-0 sm:w-24"></span>
              <span class="w-16 shrink-0 sm:w-20"></span>
            </div>
            <p class="mt-6 text-xs leading-relaxed text-neutral-400">Source: DeepSWE, August 2026.</p>
          </div>
          <a href="/search" class="mt-7 inline-block text-base text-neutral-500 underline underline-offset-4 hover:text-neutral-800">Browse all models &rarr;</a>
        </article>
        <article id="rail-3" data-rail-panel="3" class="scroll-mt-28">
          <h2 class="text-2xl font-medium tracking-tight md:text-3xl">Keep your setup</h2>
          <p class="mt-4 max-w-xl text-base leading-relaxed text-neutral-500">Launch Claude Code, Codex, and more with one command. Switch models without changing your workflow.</p>
          <div class="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div class="flex items-center gap-3 rounded-lg border border-neutral-200 px-4 py-3.5">
                <img src="/public/claude.png" alt="" class="h-6 w-6 shrink-0 rounded-sm object-contain" />
                <span class="truncate text-sm text-neutral-800">Claude Code</span>
              </div>
              <div class="flex items-center gap-3 rounded-lg border border-neutral-200 px-4 py-3.5">
                <img src="/public/codex-app.png" alt="" class="h-6 w-6 shrink-0 rounded-sm object-contain" />
                <span class="truncate text-sm text-neutral-800">Codex</span>
              </div>
              <div class="flex items-center gap-3 rounded-lg border border-neutral-200 px-4 py-3.5">
                <img src="/public/opencode.png" alt="" class="h-6 w-6 shrink-0 rounded-sm object-contain" />
                <span class="truncate text-sm text-neutral-800">OpenCode</span>
              </div>
              <div class="flex items-center gap-3 rounded-lg border border-neutral-200 px-4 py-3.5">
                <img src="/public/hermes.png" alt="" class="h-6 w-6 shrink-0 rounded-sm object-contain" />
                <span class="truncate text-sm text-neutral-800">Hermes Agent</span>
              </div>
              <div class="flex items-center gap-3 rounded-lg border border-neutral-200 px-4 py-3.5">
                <img src="/public/openclaw.svg" alt="" class="h-6 w-6 shrink-0 rounded-sm object-contain" />
                <span class="truncate text-sm text-neutral-800">OpenClaw</span>
              </div>
              <div class="flex items-center gap-3 rounded-lg border border-neutral-200 px-4 py-3.5">
                <img src="/public/vscode.svg" alt="" class="h-6 w-6 shrink-0 rounded-sm object-contain" />
                <span class="truncate text-sm text-neutral-800">VS Code</span>
              </div>
              <div class="flex items-center gap-3 rounded-lg border border-neutral-200 px-4 py-3.5">
                <img src="/public/pi.svg" alt="" class="h-6 w-6 shrink-0 rounded-sm object-contain" />
                <span class="truncate text-sm text-neutral-800">Pi</span>
              </div>
              <div class="flex items-center gap-3 rounded-lg border border-neutral-200 px-4 py-3.5">
                <img src="/public/n8n.png" alt="" class="h-6 w-6 shrink-0 rounded-sm object-contain" />
                <span class="truncate text-sm text-neutral-800">n8n</span>
              </div>
          </div>
          <a href="https://docs.ollama.com/integrations" target="_blank" rel="noopener noreferrer" class="mt-7 inline-block text-base text-neutral-500 underline underline-offset-4 hover:text-neutral-800">See all integrations &rarr;</a>
        </article>
        <article id="rail-4" data-rail-panel="4" class="scroll-mt-28">
          <h2 class="text-2xl font-medium tracking-tight md:text-3xl">Your data stays yours</h2>
          <p class="mt-4 max-w-xl text-base leading-relaxed text-neutral-500">Your data is never trained on by any provider. All cloud models are hosted in the US, Europe &amp; Singapore. Get the privacy benefits of local and the power of cloud.</p>
          <div class="mt-7 grid grid-cols-1 gap-x-10 gap-y-6 sm:grid-cols-2">
            <div>
              <p class="flex items-center gap-3 text-base font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4 shrink-0 text-neutral-400"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"></path></svg>
                Private
              </p>
              <p class="mt-1 text-sm leading-relaxed text-neutral-500">Your prompts are never tracked or trained on.</p>
            </div>
            <div>
              <p class="flex items-center gap-3 text-base font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4 shrink-0 text-neutral-400"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"></path></svg>
                Hosted
              </p>
              <p class="mt-1 text-sm leading-relaxed text-neutral-500">Cloud models are only hosted in US, Europe &amp; Singapore.</p>
            </div>
            <div>
              <p class="flex items-center gap-3 text-base font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4 shrink-0 text-neutral-400"><path stroke-linecap="round" stroke-linejoin="round" d="M8.5 16.5a5 5 0 0 1 7 0M2 8.82a15 15 0 0 1 4.17-2.65M10.66 5c4.01-.36 8.14.9 11.34 3.76M16.85 11.25a10 10 0 0 1 2.22 1.68M5 13a10 10 0 0 1 5.24-2.76M12 20h.01M2 2l20 20"></path></svg>
                Local
              </p>
              <p class="mt-1 text-sm leading-relaxed text-neutral-500">Nothing you run locally ever leaves your machine.</p>
            </div>
            <div>
              <p class="flex items-center gap-3 text-base font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4 shrink-0 text-neutral-400"><path stroke-linecap="round" stroke-linejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"></path></svg>
                Open
              </p>
              <p class="mt-1 text-sm leading-relaxed text-neutral-500">Open weights and <a href="https://github.com/ollama/ollama" class="underline underline-offset-4 hover:text-neutral-600">open source</a>.</p>
            </div>
          </div>
          <a href="/privacy" class="mt-7 inline-block text-base text-neutral-500 underline underline-offset-4 hover:text-neutral-800">How we handle data &rarr;</a>
        </article>

        
      </div>
    </div>
  </section>


  
  <section id="closer" class="mt-20 flex min-h-[70svh] w-full flex-col items-center justify-center px-6 py-14 text-center md:mt-28 md:py-16">
    <img id="closer-mascot" src="/public/hello.png" alt="" class="h-24 w-24 md:h-36 md:w-36" />
    <h2 class="mt-8 max-w-2xl text-3xl font-medium leading-[1.1] tracking-tight md:text-4xl lg:text-5xl">Get up and running in less than two minutes</h2>
    <a href="/download" class="mt-9 inline-flex items-center justify-center rounded-full bg-neutral-900 px-8 py-3.5 text-base text-white hover:bg-black">Download</a>
  </section>
  <script>
    (function () {
      var navs = {}, fills = {};
      document.querySelectorAll('[data-rail-nav]').forEach(function (a) {
        navs[a.dataset.railNav] = a;
        fills[a.dataset.railNav] = a.querySelector('.rail-fill');
      });
      var panels = [].slice.call(document.querySelectorAll('[data-rail-panel]'));
      if (!panels.length) return;
      function update() {
        
        
        var line = window.innerHeight * 0.35;
        var i = 0;
        for (var k = 0; k < panels.length; k++) {
          if (panels[k].getBoundingClientRect().top <= line) i = k;
        }
        var top = panels[i].getBoundingClientRect().top;
        var next = panels[i + 1];
        var span = next ? next.getBoundingClientRect().top - top : panels[i].getBoundingClientRect().height;
        var progress = span > 0 ? (line - top) / span : 0;
        progress = Math.max(0, Math.min(1, progress));
        var id = panels[i].dataset.railPanel;
        Object.keys(navs).forEach(function (k) {
          var on = k === id;
          navs[k].classList.toggle('text-neutral-900', on);
          navs[k].classList.toggle('text-neutral-400', !on);
          if (fills[k]) fills[k].style.transform = 'scaleX(' + (on ? progress : 0) + ')';
        });
      }
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        document.querySelectorAll('video[autoplay]').forEach(function (v) { v.autoplay = false; v.pause(); });
      }
      var mascot = document.getElementById('closer-mascot');
      var closer = document.getElementById('closer');
      function reveal() {
        if (!mascot || !closer) return;
        if (closer.getBoundingClientRect().top < window.innerHeight * 0.8) mascot.classList.add('is-in');
      }
      function onScroll() { update(); reveal(); }
      update();
      reveal();
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
    })();
  </script>
</main>


    
      
<footer class="mt-auto">

  <div class="underline-offset-4 hidden md:block">
    <div class="flex items-center justify-between px-6 py-3.5">
      <div class="text-xs text-neutral-500">© 2026 Ollama</div>
      <div class="flex space-x-6 text-xs text-neutral-500">
        <a href="/download" class="hover:underline">Download</a>
        <a href="/blog" class="hover:underline">Blog</a>
        <a href="https://docs.ollama.com" class="hover:underline">Docs</a>
        <a href="https://github.com/ollama/ollama" class="hover:underline">GitHub</a>
        <a href="https://discord.com/invite/ollama" class="hover:underline">Discord</a>
        <a href="https://twitter.com/ollama" class="hover:underline">X (Twitter)</a>
        <a href="mailto:support@ollama.com" class="hover:underline">Support</a>
        <a href="https://jobs.ashbyhq.com/ollama" class="hover:underline">Careers</a>
        <a href="/privacy" class="hover:underline">Privacy</a>
        <a href="/terms" class="hover:underline">Terms</a>
      </div>
    </div>
  </div>
  <div class="py-4 md:hidden">
    <div class="flex flex-col items-center justify-center">
      <ul class="flex flex-wrap items-center justify-center text-sm text-neutral-500">
        <li class="mx-2 my-1">
          <a href="/blog" class="hover:underline">Blog</a>
        </li>
        <li class="mx-2 my-1">
          <a href="/download" class="hover:underline">Download</a>
        </li>
        <li class="mx-2 my-1">
          <a href="https://docs.ollama.com" class="hover:underline">Docs</a>
        </li>
      </ul>
      <ul class="flex flex-wrap items-center justify-center text-sm text-neutral-500">
        <li class="mx-2 my-1">
          <a href="https://github.com/ollama/ollama" class="hover:underline">GitHub</a>
        </li>
        <li class="mx-2 my-1">
          <a href="https://discord.com/invite/ollama" class="hover:underline">Discord</a>
        </li>
        <li class="mx-2 my-1">
          <a href="https://twitter.com/ollama" class="hover:underline">X (Twitter)</a>
        </li>
        <li class="mx-2 my-1">
          <a href="https://lu.ma/ollama" class="hover:underline">Meetups</a>
        </li>
        <li class="mx-2 my-1">
          <a href="https://jobs.ashbyhq.com/ollama" class="hover:underline">Careers</a>
        </li>
        <li class="mx-2 my-1">
          <a href="/privacy" class="hover:underline">Privacy</a>
        </li>
        <li class="mx-2 my-1">
          <a href="/terms" class="hover:underline">Terms</a>
        </li>
      </ul>
      <div class="mt-2 flex items-center justify-center text-sm text-neutral-500">
        © 2026 Ollama Inc.
      </div>
    </div>
  </div>

</footer>

    

    
    <span class="hidden" id="end_of_template"></span>
  </body>
</html>

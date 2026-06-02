import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export const HomeMotion = () => {
  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) return undefined;

    const createdTriggers = [];
    const cleanupCallbacks = [];

    const ctx = gsap.context(() => {
      gsap.set(".home-motion-safe", { clearProps: "all" });

      const heroItems = [
        ".hero-kicker",
        ".heading-primary",
        ".hero-description",
        ".hero-btn-container",
        ".hero-proof-grid",
        ".hero-review-section",
      ];

      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .from(heroItems, {
          autoAlpha: 0,
          y: 28,
          duration: 0.68,
          stagger: 0.08,
          clearProps: "opacity,visibility,transform",
        })
        .from(".hero-img-box", {
          autoAlpha: 0,
          rotate: -1.5,
          scale: 0.92,
          y: 36,
          duration: 0.9,
          clearProps: "opacity,visibility,transform",
        }, "-=0.75")

      const heroParallax = gsap.to(".hero-img", {
        yPercent: -7,
        scale: 1.035,
        ease: "none",
        scrollTrigger: {
          trigger: ".section-hero",
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
      createdTriggers.push(heroParallax.scrollTrigger);

      gsap.utils
        .toArray(".home-collection-heading-container, .section-features .subheading, .section-features-heading")
        .forEach((heading) => {
          const tween = gsap.fromTo(
            heading,
            { autoAlpha: 0, y: 42 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.8,
              ease: "power3.out",
              scrollTrigger: {
                trigger: heading,
                start: "top 84%",
                once: true,
              },
            }
          );
          createdTriggers.push(tween.scrollTrigger);
        });

      gsap.utils.toArray(".feature-content").forEach((feature, index) => {
        const image = feature.querySelector(".feature-img");
        const text = feature.querySelector(".feature-text");

        const reveal = gsap.fromTo(
          feature,
          { autoAlpha: 0, y: 72 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.95,
            ease: "power3.out",
            scrollTrigger: {
              trigger: feature,
              start: "top 82%",
              once: true,
            },
          }
        );
        createdTriggers.push(reveal.scrollTrigger);

        if (image) {
          const imageTween = gsap.fromTo(
            image,
            { scale: 0.92, filter: "brightness(0.76) saturate(0.9)" },
            {
              scale: 1,
              filter: "brightness(1) saturate(1)",
              duration: 1.15,
              ease: "power3.out",
              scrollTrigger: {
                trigger: feature,
                start: "top 80%",
                once: true,
              },
            }
          );
          createdTriggers.push(imageTween.scrollTrigger);

          const parallax = gsap.to(image, {
            yPercent: index % 2 === 0 ? -6 : 6,
            ease: "none",
            scrollTrigger: {
              trigger: feature,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          });
          createdTriggers.push(parallax.scrollTrigger);
        }

        if (text) {
          const textTween = gsap.fromTo(
            text,
            { x: index % 2 === 0 ? 34 : -34 },
            {
              x: 0,
              duration: 0.85,
              ease: "power3.out",
              scrollTrigger: {
                trigger: feature,
                start: "top 82%",
                once: true,
              },
            }
          );
          createdTriggers.push(textTween.scrollTrigger);
        }
      });

      const socialTween = gsap.fromTo(
        ".social-link",
        { autoAlpha: 0, y: 24, scale: 0.9 },
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 0.56,
          ease: "back.out(1.7)",
          stagger: 0.08,
          scrollTrigger: {
            trigger: ".section-social-links",
            start: "top 88%",
            once: true,
          },
        }
      );
      createdTriggers.push(socialTween.scrollTrigger);
    });

    const bindDynamicCards = () => {
      const cards = gsap.utils.toArray(
        ".home-movie-card:not([data-gsap-home-card]), .ai-rec-card:not([data-gsap-home-card])"
      );

      cards.forEach((card, index) => {
        card.dataset.gsapHomeCard = "true";

        const tween = gsap.fromTo(
          card,
          { autoAlpha: 0, y: 48, scale: 0.96 },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: 0.72,
            delay: Math.min(index * 0.035, 0.28),
            ease: "power3.out",
            scrollTrigger: {
              trigger: card,
              start: "top 90%",
              once: true,
            },
          }
        );
        createdTriggers.push(tween.scrollTrigger);
      });
    };

    const bindHoverPhysics = () => {
      const hoverTargets = gsap.utils.toArray(
        ".btn-full, .btn-outline, .home-movie-card, .ai-rec-card, .social-link"
      );

      hoverTargets.forEach((target) => {
        if (target.dataset.gsapHomeHover) return;
        target.dataset.gsapHomeHover = "true";

        const enter = () => {
          gsap.to(target, {
            y: -4,
            duration: 0.28,
            ease: "power2.out",
            overwrite: "auto",
          });
        };
        const leave = () => {
          gsap.to(target, {
            y: 0,
            duration: 0.34,
            ease: "power2.out",
            overwrite: "auto",
          });
        };

        target.addEventListener("mouseenter", enter);
        target.addEventListener("mouseleave", leave);
        cleanupCallbacks.push(() => {
          target.removeEventListener("mouseenter", enter);
          target.removeEventListener("mouseleave", leave);
          delete target.dataset.gsapHomeHover;
        });
      });
    };

    bindDynamicCards();
    bindHoverPhysics();

    const observer = new MutationObserver(() => {
      bindDynamicCards();
      bindHoverPhysics();
      ScrollTrigger.refresh();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    const refreshTimer = window.setTimeout(() => ScrollTrigger.refresh(), 450);

    return () => {
      window.clearTimeout(refreshTimer);
      observer.disconnect();
      cleanupCallbacks.forEach((cleanup) => cleanup());
      document
        .querySelectorAll("[data-gsap-home-card]")
        .forEach((card) => delete card.dataset.gsapHomeCard);
      createdTriggers.forEach((trigger) => trigger?.kill());
      ctx.revert();
    };
  }, []);

  return null;
};

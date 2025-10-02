function parsePage() {
    const $ = (selector, context = document) => context.querySelector(selector);
    const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));
    
    const getText = (selector, defaultValue = '', processor = null, context = document) => {
        const element = typeof selector === 'string' ? $(selector, context) : selector;
        let content = element?.textContent?.trim() || defaultValue;
        
        if (processor && content) {
            try {
                content = processor(content);
            } catch (error) {
                console.error(`Error processing content for selector:`, error);
            }
        }
        
        return content;
    };

    const getMetaContent = (name) => 
        $(`meta[name="${name}"]`)?.getAttribute('content') || '';

    const getOpenGraphContent = (property) => 
        $(`meta[property="og:${property}"]`)?.getAttribute('content') || '';

    const parseCurrency = (symbol) => {
        const currencyMap = { '$': 'USD', '€': 'EUR', '₽': 'RUB' };
        return currencyMap[symbol] || symbol;
    };

    const getMetaInfo = () => {
        const processTitle = (title) => title.split('—').shift().trim();
        
        return {
            title: getText('title', '', processTitle),
            description: getMetaContent('description'),
            keywords: getMetaContent('keywords').split(',').map(k => k.trim()).filter(Boolean),
            language: document.documentElement.lang || 'en',
            opengraph: {
                title: processTitle(getOpenGraphContent('title')),
                image: getOpenGraphContent('image'),
                type: getOpenGraphContent('type'),
            }
        };
    };

    const getProductInfo = () => {
        const productElement = $('.product');
        const priceElement = $('.about .price');
        
        const parsePriceData = () => {
            if (!priceElement?.childNodes[0]) return { price: 0, oldPrice: 0, currencySymbol: '₽' };
            
            const priceText = priceElement.childNodes[0].textContent.trim();
            const oldPriceText = priceElement.children[0]?.textContent.trim();
            
            const price = parseFloat(priceText.slice(1));
            const oldPrice = oldPriceText ? parseFloat(oldPriceText.slice(1)) : 0;
            const currencySymbol = priceText[0];
            
            return {
                price,
                oldPrice,
                currencySymbol,
                discountValue: oldPrice ? oldPrice - price : 0,
                discountPercent: oldPrice ? `${(100 - (price / oldPrice) * 100).toFixed(2)}%` : '0%'
            };
        };

        const priceData = parsePriceData();
        
        const properties = $$('.about .properties li').reduce((acc, li) => {
            const key = getText(li.children[0]);
            const value = getText(li.children[1]);
            return key ? { ...acc, [key]: value } : acc;
        }, {});

        const parseTags = () => {
            const tagTypes = { green: 'category', red: 'discount', blue: 'label' };
            return Object.entries(tagTypes).reduce((acc, [className, type]) => ({
                ...acc,
                [type]: $$(`.about .tags .${className}`).map(tag => getText(tag))
            }), { category: [], discount: [], label: [] });
        };

        const images = $$('.preview nav img').map(img => ({
            preview: img.src,
            full: img.dataset.src || img.src,
            alt: img.alt
        }));

        const getFullDescription = () => {
            const descElement = $('.about .description');
            if (!descElement) return '';
            
            const clone = descElement.cloneNode(true);
            clone.querySelectorAll('*').forEach(el => {
                Array.from(el.attributes).forEach(attr => el.removeAttribute(attr.name));
            });
            
            return clone.innerHTML.trim();
        };

        return {
            id: productElement?.dataset.id || 'product1',
            name: getText('.product h1'),
            isLiked: $('.product .preview .like')?.classList.contains('active') || false,
            tags: parseTags(),
            price: priceData.price,
            oldPrice: priceData.oldPrice,
            discount: priceData.discountValue,
            discountPercent: priceData.discountPercent,
            currency: parseCurrency(priceData.currencySymbol),
            properties,
            description: getFullDescription(),
            images
        };
    };

    const getSuggestedProducts = () => {
        return $$('.suggested .items article').map(article => {
            const priceElement = $('b', article);
            const priceText = getText(priceElement);
            
            return {
                name: getText('h3', '', null, article),
                description: getText('p', '', null, article),
                image: $('img', article)?.src || '',
                price: priceText ? priceText.slice(1) : '',
                currency: parseCurrency(priceText?.[0])
            };
        });
    };

    const getReviews = () => {
        const processDate = (date) => date.replaceAll('/', '.');
        
        return $$('.reviews .items article').map(article => ({
            rating: $$('.rating span.filled', article).length,
            author: {
                avatar: $('.author img', article)?.src || '',
                name: getText('.author span', '', null, article)
            },
            title: getText('h3, h4, h5, h6', '', null, article),
            description: getText('p', '', null, article),
            date: getText('.author i', '', processDate, article)
        }));
    };

    return {
        meta: getMetaInfo(),
        product: getProductInfo(),
        suggested: getSuggestedProducts(),
        reviews: getReviews()
    };
}

window.parsePage = parsePage;
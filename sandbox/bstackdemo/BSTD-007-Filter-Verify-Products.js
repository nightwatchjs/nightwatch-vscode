describe('BSTD 007 - Filter Verify Products', function() {
  it("Select different vendors and verify products", async function (browser) {
    await browser
    .navigateTo("https://www.bstackdemo.com/")

    await browser
      .useXpath()
      .click("//*[text()='Apple']")
      .useCss()
      .assert.elementsCount(".shelf-item",9);

    for(let i=0; i< 9; i++) {
        const elementTask = element({
          selector: '.shelf-item__title',
          index: i
        });
      
        expect(elementTask).text.to.contains('iPhone');
    }


    await browser
    .useXpath()
    .click("//*[text()='Apple']")
    .click("//*[text()='Samsung']")
    .useCss()
    .assert.elementsCount(".shelf-item",7);

    for(let i=0; i< 7; i++) {
      const elementTask = element({
        selector: '.shelf-item__title',
        index: i
      });
    
      expect(elementTask).text.to.contains('Galaxy');
  }


  await browser
    .useXpath()
    .click("//*[text()='Samsung']")
    .click("//*[text()='Google']")
    .useCss()
    .assert.elementsCount(".shelf-item",3);

    for(let i=0; i< 3; i++) {
      const elementTask = element({
        selector: '.shelf-item__title',
        index: i
      });
    
      expect(elementTask).text.to.contains('Pixel');
    }  

  await browser
    .useXpath()
    .click("//*[text()='Google']")
    .click("//*[text()='OnePlus']")
    .useCss()
    .assert.elementsCount(".shelf-item",6);

    for(let i=0; i< 6; i++) {
      const elementTask = element({
        selector: '.shelf-item__title',
        index: i
      });
    
      expect(elementTask).text.to.contains('One Plus');
    }  

  await browser
    .end();
    });
});
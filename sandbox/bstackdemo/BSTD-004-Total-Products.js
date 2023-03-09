describe('BSTD 004 - Total Products', function () {
  it('Count number of all products in the store', function (browser) {
    browser
      .navigateTo('https://www.bstackdemo.com/')
      .assert.elementsCount('.shelf-item', 25)
      .end();
  });
});
